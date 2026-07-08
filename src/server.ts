import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { createIflytekClient } from './lib/iflytek/asr-client';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // 添加 WebSocket 支持用于实时语音转写
  const wss = new WebSocketServer({ server, path: '/ws/asr' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('[ASR WebSocket] 客户端已连接');
    handleASRConnection(ws);
  });

  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});

/**
 * 处理 ASR WebSocket 连接
 */
function handleASRConnection(clientWs: WebSocket) {
  const client = createIflytekClient();
  
  if (!client) {
    clientWs.send(JSON.stringify({ type: 'error', message: '讯飞 ASR 配置缺失' }));
    clientWs.close();
    return;
  }

  let isConnected = false;

  // 连接到讯飞
  client.connect(
    // onResult
    (result) => {
      clientWs.send(JSON.stringify({
        type: result.type,
        text: result.text,
        sessionId: result.sessionId
      }));
    },
    // onError
    (error) => {
      console.error('[ASR] 讯飞错误:', error.message);
      clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
    },
    // onClose
    () => {
      console.log('[ASR] 讯飞连接已关闭');
      isConnected = false;
    }
  ).then(() => {
    isConnected = true;
    clientWs.send(JSON.stringify({ type: 'connected', sessionId: client['sessionId'] }));
  }).catch((error) => {
    console.error('[ASR] 连接讯飞失败:', error.message);
    clientWs.send(JSON.stringify({ type: 'error', message: '连接讯飞服务失败' }));
    clientWs.close();
  });

  // 处理客户端消息
  clientWs.on('message', (message: WebSocket.RawData) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'audio') {
        // 音频数据（base64 编码的 MP3）
        if (isConnected && data.audio) {
          client.sendAudio(data.audio);
        }
      } else if (data.type === 'end') {
        // 结束信号
        if (isConnected) {
          client.end();
        }
      }
    } catch (error) {
      console.error('[ASR] 处理消息错误:', error);
    }
  });

  // 客户端断开连接
  clientWs.on('close', () => {
    console.log('[ASR WebSocket] 客户端已断开');
    client.close();
  });

  clientWs.on('error', (error) => {
    console.error('[ASR WebSocket] 错误:', error);
    client.close();
  });
}
