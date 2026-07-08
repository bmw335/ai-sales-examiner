/**
 * 科大讯飞实时语音转写 WebSocket 客户端
 */
import WebSocket from 'ws';
import crypto from 'crypto';

export interface IflytekConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
}

export interface IflytekASRResult {
  type: 'intermediate' | 'final';
  text: string;
  sessionId?: string;
}

export class IflytekASRClient {
  private config: IflytekConfig;
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private resultBuffer: string = '';
  private onResult: ((result: IflytekASRResult) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private onClose: (() => void) | null = null;

  constructor(config: IflytekConfig) {
    this.config = config;
  }

  /**
   * 生成讯飞鉴权 URL
   */
  private generateAuthUrl(): string {
    const { apiKey, apiSecret } = this.config;
    const host = 'iat-api.xfyun.cn';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    
    // HMAC-SHA256 签名
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    
    // 构建 authorization
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    // 构建 URL
    const url = `wss://${host}/v2/iat?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
    return url;
  }

  /**
   * 连接到讯飞服务
   */
  connect(
    onResult: (result: IflytekASRResult) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ): Promise<void> {
    this.onResult = onResult;
    this.onError = onError;
    this.onClose = onClose;
    this.resultBuffer = '';
    this.sessionId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      try {
        const url = this.generateAuthUrl();
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          // 发送启动参数 - 讯飞语音听写 API 格式
          const startParams = {
            common: {
              app_id: this.config.appId
            },
            business: {
              language: 'zh_cn',
              domain: 'iat',
              accent: 'mandarin',
              vad_eos: 3000,  // 静音检测，3秒无语音自动结束
              dwa: 'wpgs',    // 开启动态修正
              ptt: 1          // 开启标点
            }
          };
          this.ws!.send(JSON.stringify(startParams));
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('error', (error: Error) => {
          this.onError?.(error);
          reject(error);
        });

        this.ws.on('close', () => {
          this.onClose?.();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理讯飞返回的消息
   */
  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data);
      
      if (response.code !== 0) {
        this.onError?.(new Error(`讯飞 ASR 错误: ${response.code} - ${response.message}`));
        return;
      }

      const { cn } = response;
      if (!cn || !cn.st) return;

      const { type, rt } = cn.st;
      
      // type=0 表示当前句最终结果，type=1 表示中间结果
      if (type === '0' && rt && rt.length > 0) {
        // 拼接所有 ws（词片段）
        const text = rt.map((item: { ws?: { cw?: { w: string }[] }[] }) => 
          item.ws?.map((w: { cw?: { w: string }[] }) => 
            w.cw?.map((c: { w: string }) => c.w).join('')
          ).join('')
        ).join('');
        
        if (text) {
          this.resultBuffer += text;
          this.onResult?.({
            type: 'final',
            text: this.resultBuffer,
            sessionId: this.sessionId
          });
        }
      } else if (type === '1' && rt && rt.length > 0) {
        // 中间结果，用于实时反馈
        const text = rt.map((item: { ws?: { cw?: { w: string }[] }[] }) => 
          item.ws?.map((w: { cw?: { w: string }[] }) => 
            w.cw?.map((c: { w: string }) => c.w).join('')
          ).join('')
        ).join('');
        
        if (text) {
          this.onResult?.({
            type: 'intermediate',
            text: this.resultBuffer + text,
            sessionId: this.sessionId
          });
        }
      }
    } catch (error) {
      this.onError?.(error as Error);
    }
  }

  /**
   * 发送音频数据
   */
  sendAudio(data: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /**
   * 发送结束信号
   */
  end(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const endSignal = {
        end: true,
        sessionId: this.sessionId
      };
      this.ws.send(JSON.stringify(endSignal));
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * 从环境变量创建客户端
 */
export function createIflytekClient(): IflytekASRClient | null {
  const appId = process.env.IFLYTEK_APP_ID;
  const apiKey = process.env.IFLYTEK_API_KEY;
  const apiSecret = process.env.IFLYTEK_API_SECRET;

  if (!appId || !apiKey || !apiSecret) {
    console.warn('讯飞 ASR 配置缺失，请检查环境变量');
    return null;
  }

  return new IflytekASRClient({ appId, apiKey, apiSecret });
}
