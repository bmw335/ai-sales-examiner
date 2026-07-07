'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS, type Answer, type Candidate, type Question, type Report, type Flag } from '@/lib/exam-data';
import { makeLocalReport } from '@/lib/scoring';

type PageKey = 'exam' | 'admin';
type ExamStage = 'entry' | 'answer' | 'report';

const STORAGE_KEY = 'yse_internal_exam_reports_v1';
const APP_CONFIG = {
  enableBackend: true,
  apiBaseUrl: '',
  examCode: 'YSPK2026',
  examTitle: '幼师口袋销售暑期培训模拟考核',
  examSubtitle: '1v1 销售场景 · 产品认知 / 客户沟通 / 方案呈现 / 风险把控',
};

function formatTime(ts: string | number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function loadReports(): Report[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReports(reports: Report[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function gradeColor(grade: string): string {
  if (grade === 'S') return 'var(--teal)';
  if (grade === 'A') return '#1d7a4a';
  if (grade === 'B') return 'var(--blue)';
  if (grade === 'C') return 'var(--amber)';
  return 'var(--rose)';
}

function pillClassForFlag(flag: Flag): string {
  if (flag.type === 'risk') return 'pill risk';
  if (flag.type === 'warning') return 'pill warn';
  return 'pill';
}

export default function ExamPage() {
  const [page, setPage] = useState<PageKey>('exam');
  const [stage, setStage] = useState<ExamStage>('entry');
  const [candidate, setCandidate] = useState<Candidate>({ name: '', department: '', code: APP_CONFIG.examCode });
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [toast, setToast] = useState<string>('');
  const [loading, setLoading] = useState<{ show: boolean; title: string; desc?: string }>({ show: false, title: '' });
  const [recording, setRecording] = useState(false);
  const [recordingQ, setRecordingQ] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [adminFilter, setAdminFilter] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentQuestion = QUESTIONS[currentIdx];
  const totalQuestions = QUESTIONS.length;

  const metrics = useMemo(() => {
    const total = reports.length;
    const passCount = reports.filter(r => ['S', 'A', 'B'].includes(r.grade)).length;
    const avgScore = total > 0 ? Math.round(reports.reduce((sum, r) => sum + r.total, 0) / total) : 0;
    const riskCount = reports.filter(r => r.flags.length > 0).length;
    return { total, passCount, avgScore, riskCount };
  }, [reports]);

  useEffect(() => {
    setReports(loadReports());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const showLoading = (title: string, desc?: string) => setLoading({ show: true, title, desc });
  const hideLoading = () => setLoading({ show: false, title: '' });

  const startExam = () => {
    if (!candidate.name.trim() || !candidate.department.trim()) {
      showToast('请先填写姓名和部门');
      return;
    }
    setStage('answer');
    setCurrentIdx(0);
    setAnswers({});
    setReport(null);
  };

  const resetExam = () => {
    setStage('entry');
    setCandidate({ name: '', department: '', code: APP_CONFIG.examCode });
    setAnswers({});
    setCurrentIdx(0);
    setReport(null);
  };

  const saveAnswer = (transcript: string, duration?: number) => {
    const answer: Answer = {
      questionId: currentQuestion.id,
      transcript,
      duration: duration || 0,
      audioCaptured: true,
    };
    const updated = { ...answers, [currentQuestion.id]: answer };
    setAnswers(updated);
    return updated;
  };

  const goNext = () => {
    const answer = answers[currentQuestion.id];
    if (!answer || !answer.transcript.trim()) {
      showToast('请至少粘贴或输入一段逐字稿后再前进');
      return;
    }
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const transcribeAudio = async (blob: Blob) => {
    if (!APP_CONFIG.enableBackend) {
      showToast('当前为演示模式，语音转文字未启用');
      return;
    }
    showLoading('正在语音转文字', '已识别到录音，正在生成逐字稿');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/api/transcribe`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || '转写失败');
      saveAnswer(data.text, Math.round(data.duration || 0));
      showToast('语音转文字完成');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '语音转文字失败');
    } finally {
      hideLoading();
    }
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingQ(currentQuestion.id);
    } catch {
      showToast('无法访问麦克风，请检查浏览器权限');
    }
  };

  const stopRecording = () => {
    if (!recording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
    setRecordingQ(null);
  };

  const submitAll = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < totalQuestions) {
      showToast(`还有 ${totalQuestions - answeredCount} 题未作答`);
      return;
    }
    showLoading('AI 正在评分', '正在根据评分标准、产品知识包和逐字稿生成结构化报告');
    try {
      let result: Report;
      if (APP_CONFIG.enableBackend) {
        const res = await fetch(`${APP_CONFIG.apiBaseUrl}/api/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate, questions: QUESTIONS, answers }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || '评分失败');
        result = data.report;
      } else {
        result = makeLocalReport(candidate, QUESTIONS, Object.values(answers));
      }
      const savedReport: Report = { ...result, createdAt: new Date().toISOString() };
      setReport(savedReport);
      const updated = [...reports, savedReport];
      setReports(updated);
      saveReports(updated);

      if (APP_CONFIG.enableBackend) {
        try {
          await fetch(`${APP_CONFIG.apiBaseUrl}/api/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidate_name: candidate.name,
              candidate_department: candidate.department,
              exam_code: candidate.code,
              questions: QUESTIONS,
              answers,
              report: savedReport,
              source: result.source || 'ai',
            }),
          });
        } catch {
          // ignore
        }
      }
      setStage('report');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '评分失败');
    } finally {
      hideLoading();
    }
  };

  const filteredReports = adminFilter
    ? reports.filter(r => r.candidate.code.includes(adminFilter) || r.candidate.name.includes(adminFilter) || r.candidate.department.includes(adminFilter))
    : reports;

  const renderEntry = () => (
    <div className="grid two">
      <div className="card">
        <header>
          <div>
            <div className="pill">考试入场</div>
            <h2 style={{ marginTop: 8 }}>{APP_CONFIG.examTitle}</h2>
          </div>
          <div className="pill warn">内部培训</div>
        </header>
        <div className="body">
          <div className="form">
            <label>
              <span>考生姓名</span>
              <input value={candidate.name} onChange={e => setCandidate({ ...candidate, name: e.target.value })} placeholder="例如：张晓燕" />
            </label>
            <label>
              <span>所属部门/战区</span>
              <input value={candidate.department} onChange={e => setCandidate({ ...candidate, department: e.target.value })} placeholder="例如：华东B端销售组" />
            </label>
            <label>
              <span>考试码</span>
              <input value={candidate.code} onChange={e => setCandidate({ ...candidate, code: e.target.value })} />
            </label>
          </div>
          <div className="btns" style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={startExam}>开始考试</button>
            <button className="btn" onClick={() => setPage('admin')}>进入管理复盘</button>
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            说明：本页面为考试入口页。开始考试后将逐题作答，支持录音转文字或手动粘贴逐字稿。
          </p>
        </div>
      </div>
      <div className="card">
        <header>
          <div>
            <div className="pill">考试说明</div>
            <h2 style={{ marginTop: 8 }}>考前须知</h2>
          </div>
        </header>
        <div className="body">
          <ul className="list">
            <li>本次考核共 <strong>{totalQuestions} 题</strong>，覆盖产品认知、客户沟通、方案呈现、风险把控。</li>
            <li>每题建议作答 <strong>2-4 分钟</strong>，总时长约 40 分钟。</li>
            <li>可使用麦克风录音，系统会自动转成逐字稿；也可以直接粘贴准备好的话术。</li>
            <li>提交后，AI 会按评分标准生成结构化报告，主管可在管理复盘页查看。</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderAnswer = () => (
    <div className="grid two">
      <div className="card">
        <header>
          <div>
            <div className="pill">第 {currentIdx + 1} / {totalQuestions} 题</div>
            <h2 style={{ marginTop: 8 }}>{currentQuestion.title}</h2>
          </div>
          <div className="pill" style={{ background: '#eef2f7', color: '#3e526f' }}>{currentQuestion.type}</div>
        </header>
        <div className="body">
          <p className="muted" style={{ marginBottom: 12 }}>{currentQuestion.prompt}</p>
          <div className="tags">
            {currentQuestion.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
          <label style={{ marginTop: 18 }}>
            <span>逐字稿</span>
            <textarea
              value={answers[currentQuestion.id]?.transcript || ''}
              onChange={e => setAnswers({ ...answers, [currentQuestion.id]: { ...answers[currentQuestion.id], questionId: currentQuestion.id, transcript: e.target.value, duration: answers[currentQuestion.id]?.duration || 0, audioCaptured: false } })}
              placeholder="在此粘贴或输入你的回答..."
            />
          </label>
          <div className="btns" style={{ marginTop: 14 }}>
            <button className={`btn ${recording && recordingQ === currentQuestion.id ? 'danger' : 'ghost'}`} onClick={recording ? stopRecording : startRecording}>
              {recording && recordingQ === currentQuestion.id ? '停止录音' : '开始录音'}
            </button>
            <button className="btn" onClick={goPrev} disabled={currentIdx === 0}>上一题</button>
            <button className="btn" onClick={goNext} disabled={currentIdx === totalQuestions - 1}>下一题</button>
            <button className="btn primary" onClick={submitAll} disabled={Object.keys(answers).length < totalQuestions}>
              提交全部题目
            </button>
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            提示：录音会自动转成逐字稿。如果识别不准确，可以手动修改。
          </p>
        </div>
      </div>
      <div className="card">
        <header>
          <div>
            <div className="pill">答题进度</div>
            <h2 style={{ marginTop: 8 }}>已完成 {Object.keys(answers).length} / {totalQuestions}</h2>
          </div>
        </header>
        <div className="body">
          <div className="track" style={{ marginBottom: 16 }}>
            <div className="fill" style={{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {QUESTIONS.map((q, idx) => (
              <div key={q.id} className="question" style={{ padding: 12, background: answers[q.id] ? '#f0f9ff' : '#fbfcff' }}>
                <strong style={{ fontSize: 12 }}>第 {idx + 1} 题 · {q.type === 'A' ? '产品认知' : q.type === 'B' ? '客户沟通' : '方案呈现'}</strong>
                <p style={{ fontSize: 14, marginTop: 4 }}>{q.title.slice(0, 40)}...</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    if (!report) return null;
    return (
      <div className="grid two">
        <div className="card">
          <header>
            <div>
              <div className="pill">评分报告</div>
              <h2 style={{ marginTop: 8 }}>{report.candidate.name} · {report.candidate.department}</h2>
            </div>
            <div className="pill" style={{ background: '#eef2f7', color: '#3e526f' }}>考试码：{report.candidate.code}</div>
          </header>
          <div className="body">
            <div className="result-head" style={{ marginBottom: 20 }}>
              <div className="grade" style={{ background: gradeColor(report.grade) }}>
                <strong>{report.grade}</strong>
                <span>{report.total} 分</span>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>{report.conclusion}</h3>
                <p className="muted" style={{ fontSize: 13 }}>评分来源：{report.source === 'ai' ? 'AI 大模型' : '本地规则'}</p>
              </div>
            </div>
            <h3>维度得分</h3>
            {(report.dimensions || []).filter(d => d && d.name).map(dim => (
              <div key={dim.key || dim.name} className="bar">
                <div><span>{dim.name}</span><span>{dim.score} / {dim.max}</span></div>
                <div className="track"><div className="fill" style={{ width: `${dim.max > 0 ? (dim.score / dim.max) * 100 : 0}%` }} /></div>
              </div>
            ))}
            <h3>优势项</h3>
            <ul className="list">{(report.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            <h3>待改进</h3>
            <ul className="list">{(report.weaknesses || []).map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            {(report.flags || []).length > 0 && (
              <>
                <h3>风险标记</h3>
                <div className="tags">{(report.flags || []).map((f: Flag, i: number) => <span key={i} className={pillClassForFlag(f)}>{f.text}</span>)}</div>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <header>
            <div>
              <div className="pill">操作</div>
              <h2 style={{ marginTop: 8 }}>考试完成</h2>
            </div>
          </header>
          <div className="body">
            <p>恭喜完成本次模拟考核！报告已保存，主管可在管理复盘页查看。</p>
            <div className="btns" style={{ marginTop: 16 }}>
              <button className="btn primary" onClick={resetExam}>再考一次</button>
              <button className="btn" onClick={() => setPage('admin')}>查看管理复盘</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExamPage = () => {
    if (stage === 'entry') return renderEntry();
    if (stage === 'answer') return renderAnswer();
    if (stage === 'report') return renderReport();
    return null;
  };

  const renderAdminPage = () => (
    <div>
      <div className="cards">
        <div className="metric"><span>参考人数</span><strong>{metrics.total}</strong></div>
        <div className="metric"><span>通过人数</span><strong>{metrics.passCount}</strong></div>
        <div className="metric"><span>平均分</span><strong>{metrics.avgScore}</strong></div>
        <div className="metric"><span>风险标记</span><strong>{metrics.riskCount}</strong></div>
      </div>
      <div className="card">
        <header>
          <div>
            <div className="pill">管理复盘</div>
            <h2 style={{ marginTop: 8 }}>考核报告列表</h2>
          </div>
          <input placeholder="搜索姓名/部门/考试码" value={adminFilter} onChange={e => setAdminFilter(e.target.value)} style={{ width: 200 }} />
        </header>
        <div className="body">
          {filteredReports.length === 0 ? (
            <div className="empty">暂无报告数据</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>部门</th>
                    <th>考试码</th>
                    <th>总分</th>
                    <th>等级</th>
                    <th>风险</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r, i) => (
                    <tr key={i}>
                      <td>{r.candidate.name}</td>
                      <td>{r.candidate.department}</td>
                      <td>{r.candidate.code}</td>
                      <td>{r.total}</td>
                      <td><span className="pill" style={{ background: gradeColor(r.grade), color: '#fff' }}>{r.grade}</span></td>
                      <td>{r.flags.length > 0 ? r.flags.map((f, j) => <span key={j} className={pillClassForFlag(f)}>{f.text}</span>) : '-'}</td>
                      <td>{formatTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p>幼师口袋销售培训</p>
          <h1>AI销售模拟考官</h1>
        </div>
        <nav>
          <button className={`tab ${page === 'exam' ? 'active' : ''}`} onClick={() => setPage('exam')}>销售考试</button>
          <button className={`tab ${page === 'admin' ? 'active' : ''}`} onClick={() => setPage('admin')}>管理复盘</button>
        </nav>
      </header>
      <main>
        {page === 'exam' ? renderExamPage() : renderAdminPage()}
      </main>
      {toast && <div className="toast">{toast}</div>}
      {loading.show && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="spinner" />
            <h3 style={{ margin: '0 0 6px' }}>{loading.title}</h3>
            {loading.desc && <p className="muted" style={{ fontSize: 13, margin: 0 }}>{loading.desc}</p>}
          </div>
        </div>
      )}
    </>
  );
}
