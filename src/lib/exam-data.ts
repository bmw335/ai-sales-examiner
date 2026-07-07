export interface Question {
  id: string;
  type: 'A' | 'B' | 'C';
  title: string;
  customer?: string;
  prompt: string;
  tags: string[];
  points?: string[];
  risks?: string[];
  links?: string[];
  mustAsk?: string[];
}

export const QUESTIONS: Question[] = [
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

export const RUBRIC = [
  { key: "professional", name: "专业认知", max: 20, words: ["PBL", "项目化", "真实问题", "持续探究", "过程证据", "托幼", "0-3", "照护", "观察", "评价", "园本", "教研"] },
  { key: "inquiry", name: "场景问诊", max: 20, words: ["请问", "现在", "谁", "流程", "频率", "已有做法", "最难", "卡", "期望", "结果", "场景"] },
  { key: "solution", name: "方案匹配", max: 25, words: ["方案", "产品", "服务", "培训", "共创", "园本库", "成长档案", "AI", "慧园通", "试点", "路径"] },
  { key: "product", name: "产品理解", max: 15, words: ["现有", "规划", "在研", "边界", "不承诺", "共创评估", "需要评估", "未来"] },
  { key: "communication", name: "沟通表达", max: 10, words: ["理解", "认可", "担心", "建议", "先了解", "一起", "我们可以"] },
  { key: "feedback", name: "需求反馈", max: 10, words: ["需求", "场景", "角色", "流程", "频率", "痛点", "成功标准", "可复制", "产品化"] }
];

export const CONFIG = {
  appName: "AI销售模拟考官",
  examCode: "2026SUMMER",
  requireExamCode: false,
};

export interface Candidate {
  name: string;
  department: string;
  code: string;
}

export interface Answer {
  questionId: string;
  transcript: string;
  duration: number;
  audioCaptured: boolean;
}

export interface Dimension {
  key: string;
  name: string;
  max: number;
  score: number;
  comment: string;
  evidence: string;
}

export interface Flag {
  type: string;
  text: string;
}

export interface Report {
  id: string;
  createdAt: string;
  candidate: Candidate;
  questions: { id: string; title: string; type: string; tags: string[] }[];
  answers: Answer[];
  dimensions: Dimension[];
  total: number;
  grade: string;
  conclusion: string;
  strengths: string[];
  weaknesses: string[];
  flags: Flag[];
  source: string;
}
