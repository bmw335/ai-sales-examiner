# AI销售模拟考官交接包

面向幼师口袋销售团队 2026 年 7-8 月暑期考核的内部可用版工具。

## 这个包里有什么

```text
AI销售模拟考官_技术交接包/
  index.html                 页面入口，可直接双击运行
  app.js                     前端业务逻辑，内置题库和本地评分兜底
  styles.css                 页面样式
  API_CONTRACT.md            技术接口契约
  FIELD_GUIDE.md             现场考核使用手册
  backend-config/
    app-config.json          考试规则与系统配置
    question-bank.json       题库字段与第一版题库
    scoring-rubric.json      100分评分规则
    product-knowledge.md     幼师口袋/慧园通知识包
    ai-prompts.md            AI评分与转写提示词
  docs/
    TECH_HANDOFF.md          技术交接说明
    EMAIL_DRAFT.md           可直接发给技术的邮件正文
```

## 本地打开方式

双击根目录的 `index.html` 即可运行，不依赖静态服务器。

本地双击运行时：

- 可输入销售姓名并开始考试。
- 系统随机抽取 A/B/C 三类题目。
- 可手动填写逐字稿或使用“填入示例回答”测试。
- 可生成本地评分报告、导出 Markdown 和 CSV。
- 浏览器录音能力取决于本机浏览器权限；正式部署请使用 HTTPS。

## 正式内部部署建议

建议技术将三件套部署到公司网站二级域名，例如：

```text
https://sales-exam.youshikoudai.com/
```

内部版不需要做完整 SaaS，优先实现：

- HTTPS 访问。
- 简单登录或访问白名单。
- `/api/transcribe`：语音转文字。
- `/api/score`：AI评分。
- `/api/reports`：保存和读取报告。
- 后台可维护题库、评分规则、产品知识包和 Prompt。

即使后端接口暂时没有接好，前端也保留本地规则评分和手动逐字稿入口，现场考核不会完全中断。
