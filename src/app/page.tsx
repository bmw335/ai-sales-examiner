"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QUESTIONS, CONFIG, type Question, type Candidate, type Answer, type Report } from "@/lib/exam-data";
import { makeLocalReport } from "@/lib/scoring";

/* ── helpers ── */
const esc = (s: string) => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as Record<string, string>)[m]);
const pick = (type: string): Question => {
  const pool = QUESTIONS.filter(q => q.type === type);
  return pool[Math.floor(Math.random() * pool.length)];
};
const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function mockTranscript(q: Question): string {
  return `我先理解一下，贵园现在关注的是${q.tags[0]}背后的真实工作问题。请问目前这件事主要由谁负责？老师是在什么流程里完成，频率大概多久一次？现在最卡的是专业判断、资料整理、家长沟通，还是成果沉淀？如果这个问题解决，您希望看到的成功标准是什么？

基于您的描述，我不会直接说我们有某个功能就能解决，而是先把需求拆成场景、角色、流程、痛点和期望结果。现有能力上，我们可以用园本库、成长档案、家园沟通和AI资料整理帮助园所把过程证据沉淀下来；如果涉及${q.tags[0]}的深度工具，我们可以作为规划方向和共创样本进一步评估，不会把未来功能当成已经上线的能力承诺。

后续我会把这个需求整理成产品反馈卡，包括客户原话、真实使用场景、老师工作流程、出现频率、成功标准和可复制性判断。`;
}

function reportMd(r: Report): string {
  return [
    `# ${r.candidate.name} AI销售模拟考官报告`, "",
    `- 总分：${r.total}`, `- 等级：${r.grade}`, `- 结论：${r.conclusion}`, "",
    "## 维度得分", "|评分项|得分|评价|证据|", "|---|---:|---|---|",
    ...r.dimensions.map(d => `|${d.name}|${d.score}/${d.max}|${d.comment}|${d.evidence}|`),
    "", "## 优势", ...r.strengths.map(x => `- ${x}`),
    "", "## 补强", ...r.weaknesses.map(x => `- ${x}`)
  ].join("\n");
}

function download(name: string, text: string, type = "text/plain;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/* ── Toast ── */
function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [text, onDone]);
  return <div className="toast">{text}</div>;
}

/* ── Loading Overlay ── */
function LoadingOverlay({ text }: { text: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="spinner" />
        <p style={{ margin: 0, color: "#657186", fontSize: 14 }}>{text}</p>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ExamPage() {
  const [page, setPage] = useState<"exam" | "admin">("exam");
  const [stage, setStage] = useState<"entry" | "answer" | "report">("entry");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [adminReports, setAdminReports] = useState<Report[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((t: string) => setToast(t), []);

  /* timer for recording */
  useEffect(() => {
    if (stage === "answer" && seconds > 0) {
      // seconds is managed via state
    }
  }, [seconds, stage]);

  /* fetch admin reports when switching to admin */
  useEffect(() => {
    if (page === "admin") {
      fetch("/api/reports")
        .then(r => r.json())
        .then(data => { if (data.ok) setAdminReports(data.data || []); })
        .catch(() => {});
    }
  }, [page]);

  /* recording */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setSeconds(0);
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
      mediaStreamRef.current = stream;
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      showToast("录音已开始。");
    } catch {
      showToast("无法启动录音，请直接输入或粘贴逐字稿。");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    showToast("录音已停止。");
  };

  const transcribeAudio = async () => {
    if (chunksRef.current.length === 0) {
      showToast("没有录音数据，请先录音。");
      return;
    }
    setLoading("正在 AI 转写音频...");
    try {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      form.append("candidateName", candidate?.name || "");
      form.append("questionId", questions[index]?.id || "");
      form.append("examCode", candidate?.code || CONFIG.examCode);

      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data.ok && data.text) {
        if (transcriptRef.current) transcriptRef.current.value = data.text;
        showToast("转写完成。");
      } else {
        showToast(data.message || "转写失败，请手动输入逐字稿。");
      }
    } catch {
      showToast("转写服务不可用，请手动输入逐字稿。");
    } finally {
      setLoading("");
    }
  };

  /* submit current question */
  const submitQuestion = async () => {
    const transcript = (transcriptRef.current?.value || "").trim();
    if (!transcript) { showToast("请先填写逐字稿。"); return; }
    const q = questions[index];
    const newAnswers = [...answers];
    newAnswers[index] = { questionId: q.id, transcript, duration: seconds, audioCaptured: seconds > 0 };
    setAnswers(newAnswers);
    setSeconds(0);

    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      /* all questions done → score */
      await generateReport(candidate!, questions, newAnswers);
    }
  };

  const generateReport = async (cand: Candidate, qs: Question[], ans: Answer[]) => {
    setLoading("AI 正在评分...");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: { name: cand.name, department: cand.department, examCode: cand.code || CONFIG.examCode },
          questions: qs.map(q => ({ id: q.id, type: q.type, text: q.prompt, score: 20 })),
          answers: Object.fromEntries(ans.map(a => [a.questionId, { transcript: a.transcript, duration: a.duration }]))
        })
      });
      const data = await res.json();
      if (data.ok && data.report) {
        const aiReport: Report = {
          id: "R-" + Date.now(),
          createdAt: new Date().toISOString(),
          candidate: cand,
          questions: qs.map(q => ({ id: q.id, title: q.title, type: q.type, tags: q.tags })),
          answers: ans,
          dimensions: data.report.dimensions || [],
          total: data.report.total || 0,
          grade: data.report.grade || "E",
          conclusion: data.report.conclusion || "",
          strengths: data.report.strengths || [],
          weaknesses: data.report.weaknesses || [],
          flags: data.report.flags || [],
          source: "ai"
        };
        /* save to DB */
        try {
          await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidate: { name: cand.name, department: cand.department, examCode: cand.code || CONFIG.examCode },
              questions: aiReport.questions,
              answers: ans,
              report: aiReport,
              source: "ai",
              createdAt: aiReport.createdAt
            })
          });
        } catch { /* save failed, report still shows */ }
        setReport(aiReport);
        setStage("report");
      } else {
        throw new Error(data.message || "AI 评分失败");
      }
    } catch {
      /* fallback to local scoring */
      const localReport = makeLocalReport(cand, qs, ans);
      setReport(localReport);
      setStage("report");
      showToast("AI 评分不可用，已使用本地规则兜底。");
    } finally {
      setLoading("");
    }
  };

  /* demo mode */
  const loadDemo = () => {
    const cand = { name: "演示销售", department: "B端销售", code: "DEMO" };
    const qs = ["A", "B", "C"].map(pick);
    setCandidate(cand);
    setQuestions(qs);
    const demoAnswers = qs.map(q => ({ questionId: q.id, transcript: mockTranscript(q), duration: 180, audioCaptured: false }));
    setAnswers(demoAnswers);
    const r = makeLocalReport(cand, qs, demoAnswers);
    setReport(r);
    setStage("report");
  };

  /* start exam */
  const handleStart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = (e.target as HTMLFormElement).elements;
    const name = (f.namedItem("name") as HTMLInputElement).value.trim();
    const department = (f.namedItem("department") as HTMLInputElement).value.trim();
    const code = (f.namedItem("code") as HTMLInputElement).value.trim();
    if (CONFIG.requireExamCode && code !== CONFIG.examCode) { showToast("考试码不正确。"); return; }
    const cand = { name, department, code };
    const qs = ["A", "B", "C"].map(pick);
    setCandidate(cand);
    setQuestions(qs);
    setAnswers([]);
    setIndex(0);
    setStage("answer");
  };

  const restart = () => { setStage("entry"); setIndex(0); setAnswers([]); setReport(null); };

  const exportCsv = () => {
    const rows = [["姓名", "部门", "总分", "等级", "题目", "日期"], ...adminReports.map(r => [r.candidate.name, r.candidate.department || "", String(r.total), r.grade, r.questions.map(q => q.id).join("/"), new Date(r.createdAt).toLocaleString("zh-CN")])];
    download("AI销售模拟考官成绩表.csv", "\uFEFF" + rows.map(row => row.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
  };

  /* ── Render: Entry ── */
  const renderEntry = () => (
    <div className="grid two">
      <section className="card">
        <header><div><h2>开始一轮模拟考核</h2><p className="muted">系统将随机抽取 A/B/C 三类题各 1 题。</p></div><span className="pill warn">AI 评分版</span></header>
        <div className="body">
          <form id="startForm" className="form" onSubmit={handleStart}>
            <label>销售姓名<input name="name" placeholder="请输入姓名" required /></label>
            <label>部门/小组<input name="department" placeholder="如 华东区 / B端销售" /></label>
            <label>考试码<input name="code" placeholder={`如 ${CONFIG.examCode}`} /></label>
            <div className="btns">
              <button className="btn primary" type="submit">开始随机抽题</button>
              <button className="btn" type="button" onClick={loadDemo}>载入演示作答</button>
            </div>
          </form>
        </div>
      </section>
      <aside className="card">
        <header><div><h2>考核口径</h2><p className="muted">总分100分，结果进入管理复盘。</p></div></header>
        <div className="body">
          <ul className="list">
            <li><b>先问诊：</b>追问角色、流程、已有做法、痛点和期望结果。</li>
            <li><b>再匹配：</b>连接产品、服务、培训和共创。</li>
            <li><b>守边界：</b>现有能力、规划方向和可共创内容必须说清楚。</li>
            <li><b>能反馈：</b>把客户表达整理成产品反馈卡。</li>
          </ul>
        </div>
      </aside>
    </div>
  );

  /* ── Render: Answer ── */
  const renderAnswer = () => {
    const q = questions[index];
    if (!q) return null;
    return (
      <div className="grid two">
        <section className="card">
          <header>
            <div><h2>{q.id} {esc(q.title)}</h2><p className="muted">{candidate?.name}，第 {index + 1} / {questions.length} 题</p></div>
            <span className="pill" id="clock">{fmt(seconds)}</span>
          </header>
          <div className="body">
            {q.customer && <div className="question"><strong>客户台词</strong><p>{esc(q.customer)}</p></div>}
            <div className="question" style={{ marginTop: 12 }}>
              <strong>销售任务</strong><p>{esc(q.prompt)}</p>
              <div className="tags">{q.tags.map(t => <span key={t} className="tag">{esc(t)}</span>)}</div>
            </div>
            <h3>逐字稿 / 现场记录</h3>
            <textarea ref={transcriptRef} placeholder="可录音后点击 AI 转写，或直接输入现场记录。" defaultValue="" />
            <div className="btns" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={startRecording}>开始录音</button>
              <button className="btn danger" onClick={stopRecording}>停止录音</button>
              <button className="btn ghost" onClick={transcribeAudio}>AI转写音频</button>
              <button className="btn" onClick={() => { if (transcriptRef.current) transcriptRef.current.value = mockTranscript(q); showToast("已生成模拟逐字稿。"); }}>生成模拟转写</button>
              <button className="btn primary" onClick={submitQuestion}>提交本题</button>
            </div>
            <p className="muted">录音后点击 &quot;AI转写音频&quot; 进行语音转文字；若不可用，请直接粘贴逐字稿。</p>
          </div>
        </section>
        <aside className="card">
          <header><div><h2>评分提醒</h2><p className="muted">答题时尽量覆盖这些要点。</p></div></header>
          <div className="body">
            <h3>必须追问</h3>
            <ul className="list">{(q.mustAsk || ["这个问题现在由谁负责？", "希望看到什么变化？"]).map((x, i) => <li key={i}>{esc(x)}</li>)}</ul>
            <h3>产品连接</h3>
            <div className="tags">{q.links?.map(x => <span key={x} className="tag">{esc(x)}</span>)}</div>
          </div>
        </aside>
      </div>
    );
  };

  /* ── Render: Report ── */
  const renderReport = () => {
    if (!report) return <div className="empty">暂无报告</div>;
    return (
      <>
        <div className="grid two">
          <section className="card">
            <header>
              <div>
                <h2>个人考核报告</h2>
                <p className="muted">{esc(report.candidate.name)} · {esc(report.candidate.department || "未填写部门")} · {new Date(report.createdAt).toLocaleString("zh-CN")}</p>
              </div>
              <div className="btns">
                <button className="btn ghost" onClick={() => download(`${report.candidate.name}-AI销售模拟考官报告.md`, reportMd(report), "text/markdown;charset=utf-8")}>导出Markdown</button>
                <button className="btn" onClick={restart}>再考一次</button>
              </div>
            </header>
            <div className="body">
              <div className="result-head">
                <div className="grade"><strong>{report.grade}</strong><span>{report.total} 分</span></div>
                <div>
                  <h2>{esc(report.conclusion)}</h2>
                  <p className="muted">{report.source === "ai" ? "AI 大模型评分" : "当前为本地规则兜底评分；正式部署后可接AI大模型评分。"}</p>
                  <div className="tags">
                    <span className={`pill ${report.source !== "ai" ? "warn" : ""}`}>{report.source === "ai" ? "AI 评分" : "本地规则兜底"}</span>
                    {report.flags.map((f, i) => <span key={i} className={`pill ${f.type === "risk" ? "risk" : ""}`}>{f.type === "risk" ? "风险" : "正常"}</span>)}
                  </div>
                </div>
              </div>
              <h3>维度得分</h3>
              {report.dimensions.map(d => (
                <div key={d.key} className="bar">
                  <div><span>{d.name}</span><b>{d.score}/{d.max}</b></div>
                  <div className="track"><div className="fill" style={{ width: `${Math.round(d.score / d.max * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <aside className="card">
            <header><div><h2>反馈摘要</h2><p className="muted">用于主管复盘和二次演练。</p></div></header>
            <div className="body">
              <h3>优势</h3>
              <ul className="list">{report.strengths.map((x, i) => <li key={i}>{esc(x)}</li>)}</ul>
              <h3>补强</h3>
              <ul className="list">{report.weaknesses.map((x, i) => <li key={i}>{esc(x)}</li>)}</ul>
            </div>
          </aside>
        </div>
        <section className="card" style={{ marginTop: 18 }}>
          <header><div><h2>评分证据</h2><p className="muted">每项评价保留逐字稿依据。</p></div></header>
          <div className="body">
            <div className="table-wrap">
              <table>
                <thead><tr><th>评分项</th><th>得分</th><th>评价</th><th>证据</th></tr></thead>
                <tbody>{report.dimensions.map(d => (
                  <tr key={d.key}><td>{d.name}</td><td>{d.score}/{d.max}</td><td>{esc(d.comment)}</td><td>{esc(d.evidence)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </section>
      </>
    );
  };

  /* ── Render: Admin ── */
  const renderAdmin = () => {
    const list = adminReports;
    const avg = list.length ? Math.round(list.reduce((n, r) => n + r.total, 0) / list.length) : 0;
    return (
      <>
        <div className="cards">
          <div className="metric"><span>已完成</span><strong>{list.length}</strong></div>
          <div className="metric"><span>平均分</span><strong>{avg}</strong></div>
          <div className="metric"><span>待复核</span><strong>{list.filter(r => r.flags?.some(f => f.type === "risk")).length}</strong></div>
          <div className="metric"><span>题库量</span><strong>{QUESTIONS.length}</strong></div>
        </div>
        <section className="card">
          <header>
            <div><h2>成绩与报告</h2><p className="muted">数据保存在数据库中，支持跨设备查看。</p></div>
            <div className="btns">
              <button className="btn" onClick={exportCsv}>导出CSV</button>
              <button className="btn" onClick={() => { if (confirm("确定刷新数据吗？")) window.location.reload(); }}>刷新</button>
            </div>
          </header>
          <div className="body">
            {list.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>姓名</th><th>部门</th><th>分数</th><th>等级</th><th>题目</th><th>来源</th></tr></thead>
                  <tbody>{list.map(r => (
                    <tr key={r.id}>
                      <td>{esc(r.candidate.name)}</td>
                      <td>{esc(r.candidate.department || "")}</td>
                      <td>{r.total}</td>
                      <td>{r.grade}</td>
                      <td>{r.questions.map(q => q.id).join("、")}</td>
                      <td>{r.source === "ai" ? "AI 评分" : "本地规则兜底"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="empty">暂无考核结果</div>}
          </div>
        </section>
      </>
    );
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p>幼师口袋销售培训</p>
          <h1>AI销售模拟考官</h1>
        </div>
        <nav>
          <button className={`tab ${page === "exam" ? "active" : ""}`} onClick={() => setPage("exam")}>销售考试</button>
          <button className={`tab ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>管理复盘</button>
        </nav>
      </header>
      <main>
        <section hidden={page !== "exam"}>
          {stage === "entry" && renderEntry()}
          {stage === "answer" && renderAnswer()}
          {stage === "report" && renderReport()}
        </section>
        <section hidden={page !== "admin"}>
          {renderAdmin()}
        </section>
      </main>
      {toast && <Toast text={toast} onDone={() => setToast("")} />}
      {loading && <LoadingOverlay text={loading} />}
    </>
  );
}
