# AI销售模拟考官 API 契约

用于技术接入语音转写、AI评分和考核报告存储。前端已保留本地兜底逻辑，后端接口接好后可以逐步替换。

## 通用约定

- Content-Type: `application/json`
- 鉴权方式由技术决定，可使用内部登录态、Bearer Token、企业微信/飞书单点登录或内网白名单。
- 所有接口建议返回 `requestId`，便于排查。
- 音频、逐字稿、报告建议保留 30 天，考核复盘后归档或删除。

## 1. 语音转文字

`POST /api/transcribe`

前端可上传 `multipart/form-data`：

```text
audio: Blob/File
candidateName: string
questionId: string
examCode: string
```

建议响应：

```json
{
  "ok": true,
  "requestId": "tr_20260704_001",
  "text": "销售逐字稿内容",
  "confidence": 0.91,
  "duration": 123
}
```

失败响应：

```json
{
  "ok": false,
  "requestId": "tr_20260704_001",
  "message": "音频质量较低，请人工复核或重新录制"
}
```

转写要求：

- 尽量保留销售原话，不要自动润色。
- 保留 PBL、托幼一体化、园本库、成长档案、AI 等专业词。
- 不要把“规划/共创/在研”改写成“已有/已上线”。

## 2. AI评分

`POST /api/score`

请求：

```json
{
  "candidate": {
    "name": "张三",
    "team": "华东销售组",
    "examCode": "2026SUMMER"
  },
  "questions": [
    {
      "id": "B1",
      "type": "B",
      "title": "PBL异议",
      "prompt": "请先追问园所真实需求，再回应这个异议"
    }
  ],
  "answers": [
    {
      "questionId": "B1",
      "transcript": "销售逐字稿",
      "duration": 300
    }
  ]
}
```

后端评分时需加载：

- `backend-config/scoring-rubric.json`
- `backend-config/question-bank.json`
- `backend-config/product-knowledge.md`
- `backend-config/ai-prompts.md`

响应：

```json
{
  "ok": true,
  "requestId": "sc_20260704_001",
  "report": {
    "total": 82,
    "grade": "B",
    "conclusion": "可独立进行客户面谈；建议补强托幼一体化专题。",
    "dimensions": [
      {
        "key": "professional",
        "name": "专业认知",
        "max": 20,
        "score": 16,
        "comment": "能说清核心概念，但对托幼安全合规展开不足。",
        "evidence": "逐字稿中提到0-6连续服务，但未追问资质与照护流程。"
      }
    ],
    "strengths": ["先追问客户已有做法", "能连接园本库和教研服务"],
    "weaknesses": ["产品边界表达需要更清楚"],
    "flags": [
      { "type": "warn", "text": "出现了接近承诺上线时间的表达，建议复核。" }
    ],
    "productFeedback": {
      "customerOriginal": "老师不会写观察记录",
      "scene": "班级日常观察和家长沟通",
      "pain": "记录难复用，写完不知道怎么用",
      "expectedOutcome": "自动整理观察记录并形成家园沟通素材",
      "productOpportunity": "可沉淀为观察记录结构化模板与AI辅助分析需求"
    }
  }
}
```

## 3. 保存报告

`POST /api/reports`

请求：

```json
{
  "candidate": {
    "name": "张三",
    "team": "华东销售组",
    "examCode": "2026SUMMER"
  },
  "questions": [],
  "answers": [],
  "report": {},
  "source": "ai|local_fallback",
  "createdAt": "2026-07-04T10:00:00+08:00"
}
```

响应：

```json
{
  "ok": true,
  "reportId": "rp_20260704_001"
}
```

## 4. 读取报告列表

`GET /api/reports?examCode=2026SUMMER`

响应：

```json
{
  "ok": true,
  "reports": [
    {
      "reportId": "rp_20260704_001",
      "candidateName": "张三",
      "team": "华东销售组",
      "total": 82,
      "grade": "B",
      "createdAt": "2026-07-04T10:00:00+08:00",
      "reviewStatus": "pending|approved|adjusted"
    }
  ]
}
```

## 后台配置建议

后台至少提供以下配置项：

- 考试开启/关闭。
- 考试码是否必填。
- A/B/C 各类题目抽取数量。
- 题库增删改查。
- 评分规则维护。
- 产品知识库维护。
- Prompt 版本管理。
- 报告导出和人工复核。
