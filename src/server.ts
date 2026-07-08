import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

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
  const appId = process.env.IFLYTEK_APP_ID;
  const apiKey = process.env.IFLYTEK_API_KEY;
  const apiSecret = process.env.IFLYTEK_API_SECRET;

  if (!appId || !apiKey || !apiSecret) {
    clientWs.send(JSON.stringify({ type: 'error', message: '讯飞 ASR 配置缺失' }));
    clientWs.close();
    return;
  }

  // 生成讯飞鉴权 URL
  const host = 'office-api-ast-dx.iflyaisol.com';
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /ast/communicate/v1 HTTP/1.1`;
  const signature = crypto
    .createHmac('sha1', apiSecret)
    .update(signatureOrigin)
    .digest('base64');
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha1", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  const iflytekUrl = `wss://${host}/ast/communicate/v1?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;

  // 连接到讯飞
  const iflytekWs = new WebSocket(iflytekUrl);
  let sessionId = crypto.randomUUID();
  let resultBuffer = '';

  iflytekWs.on('open', () => {
    console.log('[ASR] 已连接到讯飞服务');
    // 发送启动参数
    const startParams = {
      common: { app_id: appId },
      business: {
        audio_encode: 'pcm_s16le',
        samplerate: 16000,
        channel: 1,
        vad_eos: 3000,
        language: 'zh_cn'
      }
    };
    iflytekWs.send(JSON.stringify(startParams));
    clientWs.send(JSON.stringify({ type: 'connected', sessionId }));
  });

  iflytekWs.on('message', (data: WebSocket.Data) => {
    try {
      const response = JSON.parse(data.toString());
      
      if (response.code !== 0) {
        clientWs.send(JSON.stringify({ type: 'error', message: `讯飞错误: ${response.message}` }));
        return;
      }

      const { cn } = response;
      if (!cn || !cn.st) return;

      const { type, rt } = cn.st;
      
      // 解析文本
      const parseText = (rt: any[]): string => {
        return rt.map((item: any) => 
          item.ws?.map((w: any) => 
            w.cw?.map((c: any) => c.w).join('')
          ).join('')
        ).join('');
      };

      if (rt && rt.length > 0) {
        const text = parseText(rt);
        
        if (type === '0') {
          // 最终结果
          resultBuffer += text;
          clientWs.send(JSON.stringify({ 
            type: 'final', 
            text: resultBuffer,
            sessionId 
          }));
        } else if (type === '1') {
          // 中间结果
          clientWs.send(JSON.stringify({ 
            type: 'intermediate', 
            text: resultBuffer + text,
            sessionId 
          }));
        }
      }
    } catch (error) {
      console.error('[ASR] 解析讯飞响应失败:', error);
    }
  });

  iflytekWs.on('error', (error: Error) => {
    console.error('[ASR] 讯飞连接错误:', error);
    clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
  });

  iflytekWs.on('close', () => {
    console.log('[ASR] 讯飞连接已关闭');
    clientWs.send(JSON.stringify({ type: 'end', text: resultBuffer, sessionId }));
  });

  // 处理来自前端的消息
  clientWs.on('message', (data: WebSocket.Data) => {
    // 检查是否是二进制音频数据
    if (data instanceof Buffer) {
      if (iflytekWs.readyState === WebSocket.OPEN) {
        iflytekWs.send(data);
      }
    } else {
      // 文本消息（JSON 控制指令）
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'end') {
          // 发送结束信号
          iflytekWs.send(JSON.stringify({ end: true, sessionId }));
        }
      } catch {
        // 忽略解析错误
      }
    }
  });

  clientWs.on('close', () => {
    console.log('[ASR WebSocket] 客户端已断开');
    iflytekWs.close();
  });

  clientWs.on('error', (error: Error) => {
    console.error('[ASR WebSocket] 客户端错误:', error);
    iflytekWs.close();
  });
}
