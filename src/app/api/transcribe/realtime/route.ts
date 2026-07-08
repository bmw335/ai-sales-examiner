import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function GET() {
  try {
    const apiKey = requiredEnv('IFLYTEK_API_KEY');
    const apiSecret = requiredEnv('IFLYTEK_API_SECRET');
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signature = crypto.createHmac('sha256', apiSecret).update(signatureOrigin).digest('base64');
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    const params = new URLSearchParams({ authorization, date, host });

    return NextResponse.json({
      ok: true,
      url: `wss://${host}${path}?${params.toString()}`,
      appId: requiredEnv('IFLYTEK_APP_ID'),
    });
  } catch {
    return NextResponse.json({ ok: false, message: '讯飞实时转写配置缺失' }, { status: 500 });
  }
}
