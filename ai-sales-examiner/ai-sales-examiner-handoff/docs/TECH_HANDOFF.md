# AI销售模拟考官技术交接说明

## 交付目标

用于 2026 年 7-8 月幼师口袋销售团队暑期内部考核。系统定位为内部工具，不按完整商业化 SaaS 做复杂权限和多租户。

## 前端交付物

根目录三件套：

- `index.html`
- `app.js`
- `styles.css`

这三个文件可直接双击 `index.html` 本地运行，也可作为静态资源部署到公司网站二级域名。

## 部署建议

建议二级域名：

```text
https://sales-exam.youshikoudai.com/
```

要求：

- 必须 HTTPS，浏览器录音权限依赖安全上下文。
- 建议限制内部访问或接入简单登录。
- 前端可静态部署，后端提供 API。

## 需要技术实现的后端接口

详见根目录 `API_CONTRACT.md`：

1. `POST /api/transcribe`：音频转文字。
2. `POST /api/score`：AI评分。
3. `POST /api/reports`：保存报告。
4. `GET /api/reports`：读取报告列表。

## 后台配置/知识库

请将 `backend-config/` 下文件放入后台配置或知识库：

- `app-config.json`：考试规则、角色、接口配置。
- `question-bank.json`：A/B/C 三类内置题库。
- `scoring-rubric.json`：100分评分标准和等级判定。
- `product-knowledge.md`：幼师口袋/慧园通产品知识和边界。
- `ai-prompts.md`：AI评分提示词模板。

## 现场兜底

前端保留本地规则评分与手动逐字稿入口。即使 AI 接口临时失败，也可以继续完成考核并导出报告。

正式成绩建议以“AI评分 + 负责人复核”为准。
