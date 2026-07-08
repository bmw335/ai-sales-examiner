import { NextRequest, NextResponse } from "next/server";
import { ASRClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, message: "缺少音频文件" },
        { status: 400 }
      );
    }

    // 直接读取音频并转 base64（ASR 支持 WAV/MP3/OGG OPUS/M4A）
    // 前端已录制为 ASR 原生支持的格式，无需后端转码
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // Call ASR
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ASRClient(config, customHeaders);

    const result = await client.recognize({
      uid: "exam-user",
      base64Data,
    });

    return NextResponse.json({
      ok: true,
      text: result.text || "",
      duration: result.duration || 0,
    });
  } catch (error) {
    console.error("[transcribe] Error:", error);
    return NextResponse.json(
      { ok: false, message: "语音转写服务异常" },
      { status: 500 }
    );
  }
}
