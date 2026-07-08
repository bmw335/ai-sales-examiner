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

  // 随机抽取的题目（A/B/C 各 1 题）
  const [drawnQuestions, setDrawnQuestions] = useState<Question[]>([]);

  const currentQuestion = drawnQuestions[currentIdx];
  const totalQuestions = drawnQuestions.length;

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
    // A/B/C 三类各随机抽 1 题
    const pick = (type: string) => {
      const pool = QUESTIONS.filter(q => q.type === type);
      return pool[Math.floor(Math.random() * pool.length)];
    };
    const drawn = ['A', 'B', 'C'].map(pick);
    setDrawnQuestions(drawn);
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
    setDrawnQuestions([]);
  };

  const saveAnswer = (transcript: string, duration?: number) => {
    const existing = answers[currentQuestion.id]?.transcript || '';
    const newTranscript = existing ? `${existing}\n${transcript}` : transcript;
    const answer: Answer = {
      questionId: currentQuestion.id,
      transcript: newTranscript,
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

  const transcribingRef = useRef(false);
  const chunkIndexRef = useRef(0);

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 优先使用 OGG OPUS 格式（ASR 原生支持，无需后端转码）
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '';
      const options = mimeType ? { mimeType } : undefined;
      const mr = new MediaRecorder(stream, options);
      const actualMime = mr.mimeType || mimeType || 'audio/webm';
      chunksRef.current = [];
      chunkIndexRef.current = 0;
      transcribingRef.current = false;

      // 每 3 秒触发一次 ondataavailable，实现分片实时转写
      mr.ondataavailable = async (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          const chunkBlob = e.data;
          const chunkIdx = chunkIndexRef.current++;

          // 异步转写当前分片，不阻塞录音
          if (!transcribingRef.current) {
            transcribingRef.current = true;
            try {
              const formData = new FormData();
              const ext = actualMime.includes('ogg') ? 'ogg' : 'webm';
              formData.append('audio', chunkBlob, `chunk_${chunkIdx}.${ext}`);
              formData.append('mimeType', actualMime);
              const res = await fetch(`${APP_CONFIG.apiBaseUrl}/api/transcribe`, { method: 'POST', body: formData });
              const data = await res.json();
              if (data.ok && data.text) {
                // 追加到当前逐字稿末尾
                setAnswers(prev => {
                  const existing = prev[currentQuestion.id]?.transcript || '';
                  const newTranscript = existing ? `${existing}\n${data.text}` : data.text;
                  return {
                    ...prev,
                    [currentQuestion.id]: {
                      ...prev[currentQuestion.id],
                      questionId: currentQuestion.id,
                      transcript: newTranscript,
                      duration: prev[currentQuestion.id]?.duration || 0,
                      audioCaptured: true,
                    }
                  };
                });
              }
            } catch {
              // 转写失败静默处理，不影响录音
            } finally {
              transcribingRef.current = false;
            }
          }
        }
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      // 每 3 秒触发一次 ondataavailable
      mr.start(3000);
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
          body: JSON.stringify({ candidate, questions: drawnQuestions, answers }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || '评分失败');
        result = { ...data.report, candidate };
      } else {
        result = makeLocalReport(candidate, drawnQuestions, Object.values(answers));
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
              questions: drawnQuestions,
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
    ? reports.filter(r => r.candidate && (r.candidate.code?.includes(adminFilter) || r.candidate.name?.includes(adminFilter) || r.candidate.department?.includes(adminFilter)))
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
            <h2>考核口径</h2>
            <p className="muted">总分100分，结果进入管理复盘。</p>
          </div>
        </header>
        <div className="body">
          <ul className="list">
            <li><b>先问诊：</b>追问角色、流程、已有做法、痛点和期望结果。</li>
            <li><b>再匹配：</b>连接产品、服务、培训和共创。</li>
            <li><b>守边界：</b>现有能力、规划方向和可共创内容必须说清楚。</li>
            <li><b>能反馈：</b>把客户表达整理成产品需求卡。</li>
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
            <h2>评分提醒</h2>
            <p className="muted">答题时尽量覆盖这些要点。</p>
          </div>
        </header>
        <div className="body">
          <h3>必须追问</h3>
          <ul className="list">
            {(currentQuestion.mustAsk || ['这个问题现在由谁负责？', '希望看到什么变化？']).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>产品连接</h3>
          <div className="tags">
            {(currentQuestion.links || []).map((link, idx) => (
              <span key={idx} className="tag">{link}</span>
            ))}
          </div>
          <h3>常见减分</h3>
          <ul className="list">
            {(currentQuestion.risks || []).map((risk, idx) => (
              <li key={idx}>{risk}</li>
            ))}
          </ul>
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
              <h2 style={{ marginTop: 8 }}>{report.candidate?.name || ''} · {report.candidate?.department || ''}</h2>
            </div>
            <div className="pill" style={{ background: '#eef2f7', color: '#3e526f' }}>考试码：{report.candidate?.code || ''}</div>
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
                      <td>{r.candidate?.name || '-'}</td>
                      <td>{r.candidate?.department || '-'}</td>
                      <td>{r.candidate?.code || '-'}</td>
                      <td>{r.total}</td>
                      <td><span className="pill" style={{ background: gradeColor(r.grade), color: '#fff' }}>{r.grade}</span></td>
                      <td>{(r.flags || []).length > 0 ? (r.flags || []).map((f, j) => <span key={j} className={pillClassForFlag(f)}>{f.text}</span>) : '-'}</td>
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
