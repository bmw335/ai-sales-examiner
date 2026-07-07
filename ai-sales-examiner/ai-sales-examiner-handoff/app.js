const CONFIG = {
  appName: "AI销售模拟考官",
  examCode: "2026SUMMER",
  requireExamCode: false,
  enableBackend: false,
  apiBaseUrl: "",
  endpoints: {
    transcribe: "/api/transcribe",
    score: "/api/score",
    reports: "/api/reports"
  }
};

const QUESTIONS = [
  {
    id: "A1", type: "A", title: "PBL项目化学习的核心是什么？",
    prompt: "请用园长听得懂的话说明PBL项目化学习的核心、实施关键要素和老师常见卡点。",
    tags: ["PBL", "项目化学习", "课程建设"],
    points: ["真实问题或情境驱动", "儿童持续探究", "过程证据", "成果表达与反思"],
    risks: ["把PBL说成一次主题活动或成果展"],
    links: ["未来PBL工具", "园本库", "AI项目资料整理", "教研服务"]
  },
  {
    id: "A2", type: "A", title: "主题课程、生成课程、项目课程有什么区别？",
    prompt: "请说明三类课程的区别，并举例说明销售在客户沟通时如何避免混淆。",
    tags: ["课程建设", "PBL", "园本课程"],
    points: ["主题课程偏预设脉络", "生成课程从儿童兴趣和现场事件生长", "项目课程强调问题驱动和持续探究"],
    risks: ["把三者说成完全对立"],
    links: ["课程资源", "园本库", "项目案例沉淀"]
  },
  {
    id: "A3", type: "A", title: "托幼一体化不是简单增加托班，它真正考验什么？",
    prompt: "请解释托幼一体化的核心，并说明0-3岁与3-6岁在课程、照护和家园沟通上的差异。",
    tags: ["托幼一体化", "0-3岁", "家园共育"],
    points: ["0-6岁连续服务体系", "0-3岁更强调照护、安全、依恋和家庭支持", "师资、空间、流程和合规边界"],
    risks: ["把托育等同幼儿园小班", "只讲招生增收"],
    links: ["托幼场景共创", "师训", "成长档案", "家园沟通"]
  },
  {
    id: "A4", type: "A", title: "AI在幼儿园中应该扮演什么角色？",
    prompt: "请说明AI能帮助老师做什么、不能替代什么，以及销售沟通中需要提醒园所的风险边界。",
    tags: ["AI应用", "教师减负", "风险边界"],
    points: ["AI辅助初稿、整理和建议", "教师负责判断与审核", "需要隐私、审核和使用规范"],
    risks: ["说AI可以替代教师", "忽视儿童数据和家长隐私"],
    links: ["AI工具箱", "AI成长营", "园本资料生成"]
  },
  {
    id: "B1", type: "B", title: "PBL异议",
    customer: "园长：我们幼儿园是做PBL项目化学习的，你们产品不太符合我们的需求。",
    prompt: "请先追问园所真实需求，再回应这个异议，并说明幼师口袋后续可提供的支持。",
    tags: ["PBL", "异议处理", "产品共创"],
    mustAsk: ["贵园现在最难的是选题、项目推进、过程记录、评价还是成果展示？", "老师在项目中最常卡在哪一步？"],
    points: ["认可园所专业探索", "说明PBL是问题驱动与持续探究", "连接PBL工具、园本库、AI支持与教研服务"],
    risks: ["直接说我们也有资源", "不懂PBL", "承诺马上定制"],
    links: ["未来PBL工具", "园本库", "AI项目资料整理", "教研服务"]
  },
  {
    id: "B2", type: "B", title: "老师不愿用系统",
    customer: "园长：老师已经很忙了，再上一个系统只会增加负担。",
    prompt: "请先追问老师真实工作负担，再说明数字化工具如何进入园所日常流程。",
    tags: ["教师减负", "数字化", "慧园通"],
    mustAsk: ["老师现在最耗时的是重复录入、资料整理、家长沟通还是迎检材料？", "哪些资料会反复用？"],
    points: ["认可老师负担", "强调一次记录多次复用", "连接园本库、班本库、AI整理、成长档案"],
    risks: ["否定老师", "只说系统功能多"],
    links: ["慧园通", "园本库", "班本库", "AI整理", "成长档案"]
  },
  {
    id: "B3", type: "B", title: "观察记录困难",
    customer: "园长：老师不会写观察记录，写了也感觉没什么用。",
    prompt: "请判断这背后的专业问题，并给出产品、培训与教研结合的解决方案。",
    tags: ["观察记录", "儿童评价", "教师成长"],
    mustAsk: ["这些记录最后给谁看？", "用于家长沟通、教研分析、儿童评价还是检查归档？"],
    points: ["问题不只是写作能力", "要明确目的、结构和使用机制", "连接成长档案、AI辅助分析与教研培训"],
    risks: ["把观察等同拍照", "说AI自动评价儿童"],
    links: ["成长档案", "观察记录", "AI辅助分析", "教研培训"]
  },
  {
    id: "B4", type: "B", title: "已有竞品系统",
    customer: "园长：我们已经有系统了，为什么还需要你们？",
    prompt: "请不贬低竞品地完成问诊，说明幼师口袋在学前教育场景中的差异价值。",
    tags: ["竞品异议", "产品定位", "慧园通"],
    mustAsk: ["现有系统主要解决行政、家园、资源、教师成长还是课程教研？", "老师使用最多和最少的是哪些模块？"],
    points: ["先定位现有系统已解决部分", "不否定竞品", "强调专业内容、教师成长、园本资源和AI场景支持"],
    risks: ["贬低竞品", "没问清现有系统"],
    links: ["慧园通", "专业内容资源", "教师成长", "AI工具箱"]
  },
  {
    id: "B5", type: "B", title: "托幼一体化转型",
    customer: "园长：我们想把幼儿园资源延伸到0-3岁托育，但不知道怎么做。你们能支持吗？",
    prompt: "请先拆解园所转型需求，再说明幼师口袋可支持的产品、内容、培训与共创方向。",
    tags: ["托幼一体化", "0-3岁", "产品共创"],
    mustAsk: ["园所想做的是托班、亲子课、托育服务、0-6成长服务，还是集团化托幼品牌？", "现有场地、师资、招生、照护流程和家长需求分别是什么？"],
    points: ["托幼一体化不是简单加托班", "拆成照护、安全流程、师资培训、家长服务、课程资源、数字化档案", "提醒合规边界"],
    risks: ["只讲招生增收", "把托育等同幼儿园小班", "忽视人员资质和合规"],
    links: ["托幼场景共创", "内容资源", "师训", "成长档案", "家园沟通"]
  },
  {
    id: "C1", type: "C", title: "PBL压测追问",
    customer: "考官：你刚才提到PBL，请用一句话说清楚它和主题活动最大的区别。",
    prompt: "请在1分钟内回答，重点考察概念准确性和表达清晰度。",
    tags: ["PBL", "专业压测"],
    points: ["主题活动通常围绕预设主题展开", "PBL围绕真实问题持续探究并形成过程证据和成果表达"],
    risks: ["把PBL等同主题活动"],
    links: ["PBL工具", "园本库"]
  },
  {
    id: "C2", type: "C", title: "产品边界追问",
    customer: "考官：你们现在有哪些功能已经能支持，哪些还在规划？",
    prompt: "请清楚区分现有能力、在研方向和可共创内容。",
    tags: ["产品理解", "承诺边界"],
    points: ["明确现有能力与规划能力", "不把未来功能当现有功能销售", "说明可以共创评估但不承诺上线时间"],
    risks: ["马上承诺定制", "说不清当前产品能力"],
    links: ["慧园通", "AI工具箱", "产品共创"]
  },
  {
    id: "C3", type: "C", title: "需求反馈追问",
    customer: "考官：你如何判断这是一个园的定制需求，还是可复制产品机会？",
    prompt: "请说明你会记录哪些信息，并如何初步判断产品价值。",
    tags: ["需求反馈", "产品共创"],
    points: ["记录客户原话、真实场景、角色、流程、频率、痛点、期望结果", "判断可复制性、优先级、成功标准"],
    risks: ["只记录一句客户想法"],
    links: ["产品需求卡", "共创机制"]
  },
  {
    id: "C4", type: "C", title: "托幼风险追问",
    customer: "考官：如果客户只是想靠托班增收，你如何提醒风险？",
    prompt: "请说明托幼一体化沟通中必须提醒园所注意的风险边界。",
    tags: ["托幼一体化", "风险边界"],
    points: ["托育不是简单招生增收", "关注照护安全、人员资质、空间流程、家庭支持和合规", "建议先做小范围试点和能力评估"],
    risks: ["只迎合客户增收诉求"],
    links: ["托幼场景共创", "师训", "运营流程"]
  }
];

const RUBRIC = [
  { key: "professional", name: "专业认知", max: 20, words: ["PBL", "项目化", "真实问题", "持续探究", "过程证据", "托幼", "0-3", "照护", "观察", "评价", "园本", "教研"] },
  { key: "inquiry", name: "场景问诊", max: 20, words: ["请问", "现在", "谁", "流程", "频率", "已有做法", "最难", "卡", "期望", "结果", "场景"] },
  { key: "solution", name: "方案匹配", max: 25, words: ["方案", "产品", "服务", "培训", "共创", "园本库", "成长档案", "AI", "慧园通", "试点", "路径"] },
  { key: "product", name: "产品理解", max: 15, words: ["现有", "规划", "在研", "边界", "不承诺", "共创评估", "需要评估", "未来"] },
  { key: "communication", name: "沟通表达", max: 10, words: ["理解", "认可", "担心", "建议", "先了解", "一起", "我们可以"] },
  { key: "feedback", name: "需求反馈", max: 10, words: ["需求", "场景", "角色", "流程", "频率", "痛点", "成功标准", "可复制", "产品化"] }
];

const state = { page: "exam", stage: "entry", candidate: null, questions: [], index: 0, answers: [], report: null };
const STORE = "yse_internal_exam_reports_v1";
let mediaRecorder = null;
let mediaStream = null;
let chunks = [];
let seconds = 0;
let timer = null;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const results = () => JSON.parse(localStorage.getItem(STORE) || "[]");
const saveResults = (r) => localStorage.setItem(STORE, JSON.stringify(r));
const pick = (type) => QUESTIONS.filter(q => q.type === type).sort(() => Math.random() - .5)[0];
const fmt = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function toast(text) {
  const old = $(".toast"); if (old) old.remove();
  const div = document.createElement("div");
  div.className = "toast"; div.textContent = text; document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function scoreText(text, max, words, floor = 1) {
  const hit = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  return Math.round(floor + (max - floor) * Math.min(1, hit / Math.max(3, Math.ceil(words.length * .42))));
}

function grade(total) {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "E";
}

function conclusion(g) {
  return {
    A: "可作为标杆销售；可承担重点客户深度沟通或带教示范。",
    B: "可独立进行客户面谈；建议补强个别专业专题。",
    C: "可在主管陪同下跟进客户；需二次演练后再独立面谈。",
    D: "需补训后复考；暂不建议独立处理复杂园所需求。",
    E: "需系统补课；暂不建议单独面向客户进行顾问式沟通。"
  }[g];
}

function evidence(text, words) {
  const sent = text.replace(/\n/g, "。").split(/[。！？!?]/).map(s => s.trim()).filter(Boolean);
  const found = sent.find(s => words.some(w => s.includes(w)));
  return found ? (found.length > 70 ? found.slice(0, 70) + "..." : found) : "逐字稿中没有明显对应表达。";
}

function makeReport() {
  const text = state.answers.map(a => a.transcript).join("。");
  const risky = ["马上上线", "一定上线", "包过", "替代老师", "竞品不专业", "免费定制"].filter(w => text.includes(w));
  const dims = RUBRIC.map(r => {
    let s = scoreText(text, r.max, r.words, text.length > 80 ? Math.max(2, Math.floor(r.max * .25)) : 1);
    if (r.key === "inquiry") s = Math.min(r.max, s + Math.min(4, (text.match(/[？?]/g) || []).length * 2));
    if (risky.length && ["product", "communication"].includes(r.key)) s = Math.max(0, s - 3);
    return {
      ...r,
      score: s,
      comment: s / r.max >= .72 ? `${r.name}表现较好。` : `${r.name}需要补强。`,
      evidence: evidence(text, r.words)
    };
  });
  const total = dims.reduce((n, d) => n + d.score, 0);
  const g = grade(total);
  const sorted = [...dims].sort((a, b) => b.score / b.max - a.score / a.max);
  const report = {
    id: "R-" + Date.now(),
    createdAt: new Date().toISOString(),
    candidate: state.candidate,
    questions: state.questions.map(q => ({ id: q.id, title: q.title, type: q.type, tags: q.tags })),
    answers: state.answers,
    dimensions: dims,
    total, grade: g, conclusion: conclusion(g),
    strengths: sorted.slice(0, 2).map(d => `${d.name}：${d.comment}`),
    weaknesses: sorted.slice(-2).reverse().map(d => `${d.name}：${d.comment}`),
    flags: risky.length ? risky.map(w => ({ type: "risk", text: `出现高风险表达：“${w}”。` })) : [{ type: "ok", text: "未发现明显一票否决风险，建议抽样复核。" }],
    source: "local_rule"
  };
  const list = results().filter(r => r.id !== report.id);
  list.unshift(report); saveResults(list.slice(0, 100));
  state.report = report;
}

function mockTranscript(q) {
  return `我先理解一下，贵园现在关注的是${q.tags[0]}背后的真实工作问题。请问目前这件事主要由谁负责？老师是在什么流程里完成，频率大概多久一次？现在最卡的是专业判断、资料整理、家长沟通，还是成果沉淀？如果这个问题解决，您希望看到的成功标准是什么？

基于您的描述，我不会直接说我们有某个功能就能解决，而是先把需求拆成场景、角色、流程、痛点和期望结果。现有能力上，我们可以用园本库、成长档案、家园沟通和AI资料整理帮助园所把过程证据沉淀下来；如果涉及${q.tags[0]}的深度工具，我们可以作为规划方向和共创样本进一步评估，不会把未来功能当成已经上线的能力承诺。

后续我会把这个需求整理成产品反馈卡，包括客户原话、真实使用场景、老师工作流程、出现频率、成功标准和可复制性判断。`;
}

function render() {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.page === state.page));
  $("#examPage").hidden = state.page !== "exam";
  $("#adminPage").hidden = state.page !== "admin";
  renderExam(); renderAdmin();
}

function renderExam() {
  if (state.stage === "entry") {
    $("#examPage").innerHTML = `<div class="grid two">
      <section class="card"><header><div><h2>开始一轮模拟考核</h2><p class="muted">系统将随机抽取 A/B/C 三类题各 1 题。</p></div><span class="pill warn">本地可运行版</span></header>
      <div class="body"><form id="startForm" class="form">
        <label>销售姓名<input name="name" placeholder="请输入姓名" required></label>
        <label>部门/小组<input name="department" placeholder="如 华东区 / B端销售"></label>
        <label>考试码<input name="code" placeholder="如 ${CONFIG.examCode}"></label>
        <div class="btns"><button class="btn primary">开始随机抽题</button><button class="btn" type="button" data-act="demo">载入演示作答</button></div>
      </form></div></section>
      <aside class="card"><header><div><h2>考核口径</h2><p class="muted">总分100分，结果进入管理复盘。</p></div></header><div class="body">
        <ul class="list"><li><b>先问诊：</b>追问角色、流程、已有做法、痛点和期望结果。</li><li><b>再匹配：</b>连接产品、服务、培训和共创。</li><li><b>守边界：</b>现有能力、规划方向和可共创内容必须说清楚。</li><li><b>能反馈：</b>把客户表达整理成产品需求卡。</li></ul>
      </div></aside></div>`;
    return;
  }
  if (state.stage === "answer") {
    const q = state.questions[state.index];
    $("#examPage").innerHTML = `<div class="grid two"><section class="card"><header><div><h2>${q.id} ${esc(q.title)}</h2><p class="muted">${esc(state.candidate.name)}，第 ${state.index + 1} / ${state.questions.length} 题</p></div><span class="pill" id="clock">${fmt(seconds)}</span></header><div class="body">
      ${q.customer ? `<div class="question"><strong>客户台词</strong><p>${esc(q.customer)}</p></div>` : ""}
      <div class="question" style="margin-top:12px"><strong>销售任务</strong><p>${esc(q.prompt)}</p><div class="tags">${q.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>
      <h3>逐字稿 / 现场记录</h3><textarea id="transcript" placeholder="可录音后粘贴逐字稿，也可直接输入现场记录。"></textarea>
      <div class="btns" style="margin-top:12px"><button class="btn primary" data-act="record">开始录音</button><button class="btn danger" data-act="stop">停止录音</button><button class="btn ghost" data-act="mock">生成模拟转写</button><button class="btn primary" data-act="submit">提交本题</button></div>
      <p class="muted">正式部署后技术可接入 /api/transcribe 和 /api/score；本文件可离线兜底。</p>
    </div></section><aside class="card"><header><div><h2>评分提醒</h2><p class="muted">答题时尽量覆盖这些要点。</p></div></header><div class="body">
      <h3>必须追问</h3><ul class="list">${(q.mustAsk || ["这个问题现在由谁负责？", "希望看到什么变化？"]).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <h3>产品连接</h3><div class="tags">${q.links.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>
    </div></aside></div>`;
    return;
  }
  renderReport(state.report, $("#examPage"));
}

function renderReport(report, root) {
  if (!report) { root.innerHTML = `<div class="empty">暂无报告</div>`; return; }
  root.innerHTML = `<div class="grid two"><section class="card"><header><div><h2>个人考核报告</h2><p class="muted">${esc(report.candidate.name)} · ${esc(report.candidate.department || "未填写部门")} · ${new Date(report.createdAt).toLocaleString("zh-CN")}</p></div><div class="btns"><button class="btn ghost" data-act="download" data-id="${report.id}">导出Markdown</button><button class="btn" data-act="restart">再考一次</button></div></header><div class="body">
    <div class="result-head"><div class="grade"><strong>${report.grade}</strong><span>${report.total} 分</span></div><div><h2>${esc(report.conclusion)}</h2><p class="muted">当前为本地规则兜底评分；正式部署后可接AI大模型评分。</p><div class="tags"><span class="pill warn">本地规则兜底</span>${report.flags.map(f => `<span class="pill ${f.type === "risk" ? "risk" : ""}">${f.type === "risk" ? "风险" : "正常"}</span>`).join("")}</div></div></div>
    <h3>维度得分</h3>${report.dimensions.map(d => `<div class="bar"><div><span>${d.name}</span><b>${d.score}/${d.max}</b></div><div class="track"><div class="fill" style="width:${Math.round(d.score / d.max * 100)}%"></div></div></div>`).join("")}
  </div></section><aside class="card"><header><div><h2>反馈摘要</h2><p class="muted">用于主管复盘和二次演练。</p></div></header><div class="body"><h3>优势</h3><ul class="list">${report.strengths.map(x => `<li>${esc(x)}</li>`).join("")}</ul><h3>补强</h3><ul class="list">${report.weaknesses.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></aside></div>
  <section class="card" style="margin-top:18px"><header><div><h2>评分证据</h2><p class="muted">每项评价保留逐字稿依据。</p></div></header><div class="body"><div class="table-wrap"><table><thead><tr><th>评分项</th><th>得分</th><th>评价</th><th>证据</th></tr></thead><tbody>${report.dimensions.map(d => `<tr><td>${d.name}</td><td>${d.score}/${d.max}</td><td>${esc(d.comment)}</td><td>${esc(d.evidence)}</td></tr>`).join("")}</tbody></table></div></div></section>`;
}

function renderAdmin() {
  const list = results();
  const avg = list.length ? Math.round(list.reduce((n, r) => n + r.total, 0) / list.length) : 0;
  $("#adminPage").innerHTML = `<div class="cards"><div class="metric"><span>已完成</span><strong>${list.length}</strong></div><div class="metric"><span>平均分</span><strong>${avg}</strong></div><div class="metric"><span>待复核</span><strong>${list.filter(r => r.flags.some(f => f.type === "risk")).length}</strong></div><div class="metric"><span>题库量</span><strong>${QUESTIONS.length}</strong></div></div>
  <section class="card"><header><div><h2>成绩与报告</h2><p class="muted">数据保存在当前浏览器本地，正式部署后可接后端。</p></div><div class="btns"><button class="btn" data-act="csv">导出CSV</button><button class="btn" data-act="clear">清空本地结果</button></div></header><div class="body">${list.length ? `<div class="table-wrap"><table><thead><tr><th>姓名</th><th>部门</th><th>分数</th><th>等级</th><th>题目</th><th>来源</th></tr></thead><tbody>${list.map(r => `<tr><td>${esc(r.candidate.name)}</td><td>${esc(r.candidate.department || "")}</td><td>${r.total}</td><td>${r.grade}</td><td>${r.questions.map(q => q.id).join("、")}</td><td>本地规则兜底</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">暂无考核结果</div>`}</div></section>`;
}

async function startRecording() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = []; seconds = 0;
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.start();
    timer = setInterval(() => { seconds += 1; const c = $("#clock"); if (c) c.textContent = fmt(seconds); }, 1000);
    toast("录音已开始。若浏览器不支持，请直接输入逐字稿。");
  } catch (e) {
    toast("无法启动录音，请直接输入或粘贴逐字稿。");
  }
}

function stopRecording() {
  if (timer) clearInterval(timer);
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  mediaRecorder = null; mediaStream = null;
  toast("录音已停止。请确认逐字稿后提交。");
}

function download(name, text, type = "text/plain;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

function reportMd(r) {
  return [`# ${r.candidate.name} AI销售模拟考官报告`, "", `- 总分：${r.total}`, `- 等级：${r.grade}`, `- 结论：${r.conclusion}`, "", "## 维度得分", "|评分项|得分|评价|证据|", "|---|---:|---|---|", ...r.dimensions.map(d => `|${d.name}|${d.score}/${d.max}|${d.comment}|${d.evidence}|`), "", "## 优势", ...r.strengths.map(x => `- ${x}`), "", "## 补强", ...r.weaknesses.map(x => `- ${x}`)].join("\n");
}

document.addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (tab) { state.page = tab.dataset.page; render(); return; }
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === "demo") {
    state.candidate = { name: "演示销售", department: "B端销售", code: "DEMO" };
    state.questions = ["A", "B", "C"].map(pick);
    state.answers = state.questions.map(q => ({ questionId: q.id, transcript: mockTranscript(q), duration: 180, audioCaptured: false }));
    makeReport(); state.stage = "report"; render(); return;
  }
  if (act === "record") startRecording();
  if (act === "stop") stopRecording();
  if (act === "mock") { $("#transcript").value = mockTranscript(state.questions[state.index]); toast("已生成模拟逐字稿。"); }
  if (act === "submit") {
    const transcript = ($("#transcript")?.value || "").trim();
    if (!transcript) { toast("请先填写逐字稿。"); return; }
    const q = state.questions[state.index];
    state.answers[state.index] = { questionId: q.id, transcript, duration: seconds, audioCaptured: seconds > 0 };
    seconds = 0;
    if (state.index < state.questions.length - 1) { state.index += 1; render(); } else { makeReport(); state.stage = "report"; render(); }
  }
  if (act === "restart") { state.stage = "entry"; state.index = 0; state.answers = []; state.report = null; render(); }
  if (act === "download") download(`${state.report.candidate.name}-AI销售模拟考官报告.md`, reportMd(state.report), "text/markdown;charset=utf-8");
  if (act === "csv") {
    const rows = [["姓名","部门","总分","等级","题目","日期"], ...results().map(r => [r.candidate.name, r.candidate.department || "", r.total, r.grade, r.questions.map(q => q.id).join("/"), new Date(r.createdAt).toLocaleString("zh-CN")])];
    download("AI销售模拟考官成绩表.csv", "\uFEFF" + rows.map(row => row.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
  }
  if (act === "clear" && confirm("确定清空本地结果吗？")) { saveResults([]); render(); }
});

document.addEventListener("submit", e => {
  if (e.target.id === "startForm") {
    e.preventDefault();
    const f = e.target.elements;
    if (CONFIG.requireExamCode && f.code.value.trim() !== CONFIG.examCode) { toast("考试码不正确。"); return; }
    state.candidate = { name: f.name.value.trim(), department: f.department.value.trim(), code: f.code.value.trim() };
    state.questions = ["A", "B", "C"].map(pick);
    state.answers = []; state.index = 0; state.stage = "answer"; render();
  }
});

render();
