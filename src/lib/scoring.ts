import { RUBRIC, type Answer, type Question, type Dimension, type Flag, type Report } from './exam-data';

function scoreText(text: string, max: number, words: string[], floor = 1): number {
  const hit = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  return Math.round(floor + (max - floor) * Math.min(1, hit / Math.max(3, Math.ceil(words.length * 0.42))));
}

function grade(total: number): string {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "E";
}

function conclusion(g: string): string {
  const map: Record<string, string> = {
    A: "可作为标杆销售；可承担重点客户深度沟通或带教示范。",
    B: "可独立进行客户面谈；建议补强个别专业专题。",
    C: "可在主管陪同下跟进客户；需二次演练后再独立面谈。",
    D: "需补训后复考；暂不建议独立处理复杂园所需求。",
    E: "需系统补课；暂不建议单独面向客户进行顾问式沟通。"
  };
  return map[g] || "";
}

function evidence(text: string, words: string[]): string {
  const sent = text.replace(/\n/g, "。").split(/[。！？!?]/).map(s => s.trim()).filter(Boolean);
  const found = sent.find(s => words.some(w => s.includes(w)));
  return found ? (found.length > 70 ? found.slice(0, 70) + "..." : found) : "逐字稿中没有明显对应表达。";
}

export function makeLocalReport(
  candidate: { name: string; department: string; code: string },
  questions: Question[],
  answers: Answer[]
): Report {
  const text = answers.map(a => a.transcript).join("。");
  const risky = ["马上上线", "一定上线", "包过", "替代老师", "竞品不专业", "免费定制"].filter(w => text.includes(w));
  const dims: Dimension[] = RUBRIC.map(r => {
    let s = scoreText(text, r.max, r.words, text.length > 80 ? Math.max(2, Math.floor(r.max * 0.25)) : 1);
    if (r.key === "inquiry") s = Math.min(r.max, s + Math.min(4, (text.match(/[？?]/g) || []).length * 2));
    if (risky.length && ["product", "communication"].includes(r.key)) s = Math.max(0, s - 3);
    return {
      key: r.key,
      name: r.name,
      max: r.max,
      score: s,
      pct: Math.round((s / r.max) * 100),
      note: evidence(text, r.words),
      comment: s / r.max >= 0.72 ? `${r.name}表现较好。` : `${r.name}需要补强。`,
      evidence: evidence(text, r.words)
    };
  });
  const total = dims.reduce((n, d) => n + d.score, 0);
  const g = grade(total);
  const sorted = [...dims].sort((a, b) => b.score / b.max - a.score / a.max);
  const flags: Flag[] = risky.length
    ? risky.map(w => ({ type: "risk", text: `出现高风险表达："${w}"。` }))
    : [{ type: "ok", text: "未发现明显一票否决风险，建议抽样复核。" }];

  return {
    id: "R-" + Date.now(),
    createdAt: new Date().toISOString(),
    candidate,
    questions: questions.map(q => ({ id: q.id, title: q.title, type: q.type, tags: q.tags })),
    answers,
    dimensions: dims,
    total,
    grade: g,
    conclusion: conclusion(g),
    strengths: sorted.slice(0, 2).map(d => `${d.name}：${d.comment}`),
    weaknesses: sorted.slice(-2).reverse().map(d => `${d.name}：${d.comment}`),
    flags,
    source: "local_rule"
  };
}
