import { NextRequest, NextResponse } from "next/server";
import { ASRClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

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

    // Save uploaded audio to temp file
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${Date.now()}.webm`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.wav`);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(inputPath, buffer);

    // Convert webm/opus to wav using ffmpeg (ASR supports WAV)
    try {
      execSync(
        `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}" 2>/dev/null`,
        { timeout: 30000 }
      );
    } catch (ffmpegErr) {
      // Clean up
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      return NextResponse.json(
        { ok: false, message: "音频格式转换失败" },
        { status: 500 }
      );
    }

    // Clean up input
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    // Read converted wav and convert to base64
    const wavBuffer = fs.readFileSync(outputPath);
    const base64Data = wavBuffer.toString("base64");

    // Clean up output
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

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
