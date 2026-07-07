import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import fs from "fs";
import path from "path";

export const maxDuration = 120;

interface RubricDimension {
  key: string;
  name: string;
  max: number;
  excellent: string;
  deduction: string;
}

interface Rubric {
  totalScore: number;
  dimensions: RubricDimension[];
  gradeRules: { min: number; max: number; grade: string; conclusion: string }[];
  oneVoteRisks: string[];
}

function readKnowledgeFiles() {
  const baseDir = path.join(process.cwd(), "backend-config");

  let rubric: Rubric = { totalScore: 100, dimensions: [], gradeRules: [], oneVoteRisks: [] };
  let productKnowledge = "";
  let systemPrompt = "";
  let userPromptTemplate = "";

  try {
    const rubricRaw = fs.readFileSync(path.join(baseDir, "scoring-rubric.json"), "utf-8");
    rubric = JSON.parse(rubricRaw);
  } catch {
    console.warn("[score] Failed to read scoring-rubric.json, using defaults");
  }

  try {
    productKnowledge = fs.readFileSync(path.join(baseDir, "product-knowledge.md"), "utf-8");
  } catch {
    console.warn("[score] Failed to read product-knowledge.md");
  }

  try {
    const promptsRaw = fs.readFileSync(path.join(baseDir, "ai-prompts.md"), "utf-8");
    // Extract system prompt from ```text blocks
    const systemMatch = promptsRaw.match(/## 评分 System Prompt\s*\n\s*```text\n([\s\S]*?)```/);
    if (systemMatch) systemPrompt = systemMatch[1].trim();

    // Extract user prompt template
    const userMatch = promptsRaw.match(/## 评分 User Prompt 模板\s*\n\s*```text\n([\s\S]*?)```/);
    if (userMatch) userPromptTemplate = userMatch[1].trim();
  } catch {
    console.warn("[score] Failed to read ai-prompts.md");
  }

  return { rubric, productKnowledge, systemPrompt, userPromptTemplate };
}

function buildRubricText(rubric: Rubric): string {
  return rubric.dimensions
    .map((d) => {
      return `### ${d.name} (${d.key}) - 满分 ${d.max} 分\n- 优秀标准: ${d.excellent}\n- 扣分项: ${d.deduction}`;
    })
    .join("\n\n");
}

function buildQAText(
  questions: { id: string; type: string; text: string; score: number }[],
  answers: Record<string, { transcript: string; duration: number }>
): string {
  const typeMap: Record<string, string> = { A: "知识题", B: "场景题", C: "压力题" };
  return questions
    .map((q, idx) => {
      const answer = answers[q.id] || { transcript: "(未作答)", duration: 0 };
      const typeLabel = typeMap[q.type] || q.type;
      return `### 题目 ${idx + 1} [${typeLabel}] (满分: ${q.score}分)\n**题目**: ${q.text}\n**逐字稿**: ${answer.transcript}\n**回答时长**: ${answer.duration}秒`;
    })
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidate, questions, answers } = body;

    if (!candidate || !questions || !answers) {
      return NextResponse.json(
        { ok: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    const { rubric, productKnowledge, systemPrompt, userPromptTemplate } = readKnowledgeFiles();

    const rubricText = buildRubricText(rubric);
    const qaText = buildQAText(questions, answers);

    // Build final system prompt
    const finalSystemPrompt = systemPrompt || "你是幼师口袋销售团队暑期培训的AI考官。请严格依据评分标准对销售逐字稿进行评分。你必须输出JSON，不要输出Markdown。";

    // Build final user prompt using the template
    let finalUserPrompt: string;
    if (userPromptTemplate) {
      finalUserPrompt = userPromptTemplate
        .replace("{candidate}", JSON.stringify(candidate))
        .replace("{questions}", JSON.stringify(questions.map((q: { id: string; text: string }) => ({ id: q.id, text: q.text }))))
        .replace("{answers}", JSON.stringify(answers))
        .replace("{rubric}", rubricText)
        .replace("{productKnowledge}", productKnowledge);
    } else {
      finalUserPrompt = `请根据以下信息为销售打分：\n\n【销售信息】\n${JSON.stringify(candidate)}\n\n【题目与逐字稿】\n${qaText}\n\n【评分标准】\n${rubricText}\n\n【产品知识包】\n${productKnowledge}\n\n请输出JSON格式的评分结果。`;
    }

    // Call LLM
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: finalUserPrompt },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.3,
    });

    // Parse the response to extract JSON
    let reportData;
    try {
      const content = response.content;
      // Try to extract JSON from the response (handle ```json wrapper)
      let jsonStr = content;
      const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim();
      } else {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      reportData = JSON.parse(jsonStr);
      // If the response wraps in { report: ... }, unwrap it
      if (reportData.report) {
        reportData = reportData.report;
      }
    } catch (parseErr) {
      console.error("[score] Failed to parse LLM response:", parseErr);
      return NextResponse.json({
        ok: false,
        message: "AI评分结果解析失败，请使用本地规则评分",
        useLocalRule: true,
      });
    }

    return NextResponse.json({
      ok: true,
      report: reportData,
    });
  } catch (error) {
    console.error("[score] Error:", error);
    return NextResponse.json(
      { ok: false, message: "AI评分服务异常", useLocalRule: true },
      { status: 500 }
    );
  }
}
