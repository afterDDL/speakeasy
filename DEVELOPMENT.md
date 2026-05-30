# SpeakEasy 开发文档

版本：v0.1.0  
线上地址：https://speakeasy-evd.pages.dev  
GitHub：https://github.com/afterDDL/speakeasy

## 1. 产品定位

SpeakEasy 是一款面向雅思口语备考者的沉浸式 AI 口语模拟练习产品。

它针对主流雅思刷题网站口语练习体验较弱的问题设计：很多网站的口语练习更像“题库 + 录音器”，用户需要自己选题、自己看题卡、自己点录音，练习结束后通常只能得到语音转文字结果。SpeakEasy 希望把这类低代入感的练习升级成“考官读题、隐藏题卡、计时推进、保存历史、AI 反馈、可重答”的完整练习闭环。

一句话概括：

SpeakEasy 将传统雅思口语刷题网站中低代入感的“题库录音”体验，升级为一个可听题、可模拟、可单题突破、可保存、可 AI 反馈的沉浸式口语练习流程。

## 2. 目标用户与核心痛点

目标用户：

- 正在准备 IELTS Speaking 的考生
- 希望反复刷题、复盘表达质量的用户
- 想体验 AI 教育产品原型的作品集访客

核心痛点：

- 普通题库网站需要用户自己看题，缺少真实考场中的听题反应。
- 录音练习缺少考官、计时、流程推进，代入感弱。
- 练习结束后只给转写，不知道回答是否切题、哪里应该展开。
- 反复刷题时容易抽到重复题，覆盖效率低。
- 浏览器语音识别受设备、网络、权限影响，用户容易误以为产品坏了。

## 3. 当前功能范围

### 3.1 首页与练习入口

首页提供：

- 四个考官形象：Alex、Priya、Kenji、Maya
- 四种练习模式：Part 1 专项、Part 2 专项、Part 3 专项、完整模拟
- 浏览器兼容提示：推荐 Android Chrome / Edge 或桌面 Chrome / Edge

### 3.2 练习模式

支持：

- Part 1 专项
- Part 2 专项
- Part 3 专项
- 完整模拟：Part 1 + Part 2 + Part 3
- 单题练习：从题库或报告页进入某一道题的单题模拟

练习页能力：

- 考官头像与说话中动效
- 考官朗读题目
- 启用考官语音后再自动/手动朗读，适配浏览器 autoplay 限制
- P1/P3 题目隐藏/显示
- P2 准备时间
- 答题计时
- 浏览器 SpeechRecognition 转写
- 文本输入兜底
- 可选择练习时是否显示自己的转写内容
- 每次练习结束后保存历史并进入报告页

### 3.3 完整模拟流程

完整模拟目标是更接近真实 IELTS Speaking：

- Part 1 先保留 Work/Study 开场，但固定题控制在 3 道以内
- Part 2 包含准备时间和长回答时间
- Part 2 有 40% 概率追加追问：“你有没有和别人讲过这个故事”
- Part 3 可根据考生回答进行内容相关追问
- 整个 Part 3 中考官追加追问不超过两次
- 回答时间结束后自动推进

### 3.4 Part 1 抽题策略

为兼顾真实考试和刷题效率，当前策略为：

- 完整模拟：保留 Work/Study 固定开场，最多 3 道
- Part 1 专项：取消 Work/Study 优先权重，把它与 Home、Hometown、City 等分类同等随机
- 近期去重：记录最近 40 道 Part 1 题，后续抽题时优先避开
- 分类分散：同一轮尽量从不同分类轮流抽题，减少同类题过度集中

### 3.5 题库管理

题库页支持：

- 浏览 Part 1、Part 2 & 3
- 搜索题目、中文题名、分类
- 分类筛选
- 展开 Part 2 & 3 完整题卡
- Part 1 单题练习
- Part 2 题卡练习
- Part 3 追问单题练习
- 管理工具折叠，避免影响普通访问体验
- 增删改 Part 1 题目
- 增删改 Part 2 题卡和关联 Part 3 追问
- JSON 导入/导出
- 下载导入模板
- 恢复内置题库

注意：用户上传或编辑的题库只保存在当前浏览器 localStorage，不会影响其他用户、GitHub 源码或 Cloudflare 线上默认题库。

### 3.6 报告页与 AI 反馈

练习结束后生成报告：

- 综合评分
- IELTS 参考 Band
- 流利度、词汇、语法、发音四项
- 本次亮点
- 主要问题
- 下一次练习目标
- 逐题回看
- DeepSeek 自动生成精细反馈

逐题反馈已经从通用建议升级为结构化字段：

- 问题所在
- 改进建议
- 答题结构
- 内容缺口
- 示例升级
- 可用表达

报告页每道题支持“重答此题”，会进入单题练习并带上原题、中文备注和 P2 prompts。

### 3.7 分享与下载

报告页支持生成分享图：

- 使用 Canvas 绘制报告图片
- 用户可下载图片
- 适合内测反馈、作品集展示和社媒传播

### 3.8 设置页

设置页包含：

- Part 2 准备时间
- 自动结束等待
- 是否显示我的回答
- 常见问题的解决方法
- 开发者设置折叠区
- 开发者 GitHub
- 当前版本号

FAQ 覆盖：

- 麦克风权限被拒绝
- SpeechRecognition network 错误
- 手机浏览器允许权限后仍无法转写
- 考官不读题或重播无声
- 语音失败时如何继续练习

## 4. 技术架构

技术栈：

- Vite
- React
- CSS
- lucide-react
- Browser SpeechRecognition
- Browser speechSynthesis
- localStorage
- Cloudflare Pages
- Cloudflare Pages Functions
- DeepSeek API

整体架构：

```text
Browser
  |
  | Vite + React SPA
  | - practice flow
  | - speech recognition
  | - examiner speech synthesis
  | - local history
  | - local question bank edits
  | - report rendering
  |
  | POST /api/score
  v
Cloudflare Pages Function
  |
  | server-side DEEPSEEK_API_KEY
  v
DeepSeek API
```

前端是单页应用，使用 hash 路由：

- `#/`
- `#/practice`
- `#/report`
- `#/history`
- `#/questions`
- `#/settings`
- `#/share`

## 5. 主要文件说明

```text
src/main.jsx
```

主应用文件，包含页面组件、练习流程、题库页、设置页、报告页、语音逻辑、出题策略和报告图片生成。

```text
src/styles.css
```

全局样式文件，包含首页、练习页、题库页、报告页、设置页等 UI 样式。

```text
src/lib/storage.js
```

localStorage 封装：

- settings
- sessions
- custom question bank
- recent Part 1 questions

```text
src/lib/scoring.js
```

评分逻辑：

- 本地启发式评分兜底
- DeepSeek 调用
- DeepSeek proxy 调用
- AI prompt
- 分数归一化
- 逐题反馈结构归一化

```text
src/data/questionBank.js
```

内置真实题库，包含：

- Part 1 分类与问题
- Part 2 题卡
- Part 3 追问

```text
functions/api/score.js
```

Cloudflare Pages Function，用于安全调用 DeepSeek。API Key 只保存在 Cloudflare 环境变量中，不暴露给浏览器。

```text
README.md
```

面向 GitHub/作品集访客的项目介绍。

```text
DEPLOYMENT.md
```

部署清单。

## 6. 数据存储

当前所有用户侧数据都保存在当前浏览器 localStorage。

保存内容：

- 练习历史
- 用户设置
- 用户自定义题库
- 最近 Part 1 抽题记录

作用范围：

- 同一浏览器
- 同一域名
- 同一设备

例如：

- `http://127.0.0.1:5173` 的数据和 `https://speakeasy-evd.pages.dev` 的数据不互通
- 换浏览器、换设备、清缓存后数据不会自动同步
- 题库导入只影响当前用户本地，不影响其他用户

如果未来需要跨设备同步，需要增加后端数据库和账号系统。

## 7. 语音能力说明

### 7.1 考官朗读

使用浏览器 `speechSynthesis`。

当前做了：

- 用户点击“启用考官语音”后再朗读，降低 autoplay 拦截概率
- 重播题目
- 麦克风开始前停止考官朗读
- 按考官形象尽量匹配男声/女声

限制：

- 浏览器没有标准的 voice gender 字段，只能根据 voice name 进行偏好匹配
- 不同设备可用音色不同，无法 100% 保证声音性别和口音
- 某些在线自然音色可能受网络或代理影响

### 7.2 语音转文字

使用浏览器 `SpeechRecognition` / `webkitSpeechRecognition`。

限制：

- Chrome / Edge 的网页语音识别通常依赖在线服务
- 可能出现 `network`、`aborted`、`not-allowed` 等错误
- iPhone、Safari、微信/QQ 内置浏览器支持不稳定
- 移动端浏览器即使弹出麦克风权限，也不代表 SpeechRecognition 可用

产品兜底：

- 显示错误原因
- 用户可以手动输入回答
- 手动输入同样可以保存历史和生成 AI 报告

## 8. AI 评分设计

线上版本通过 Cloudflare Pages Function 调用 DeepSeek：

```text
POST /api/score
```

Cloudflare 环境变量：

```text
DEEPSEEK_API_KEY
DEEPSEEK_MODEL=deepseek-chat
```

AI prompt 的目标：

- 返回严格 JSON
- 给出 IELTS band style 分数
- 结合题目、Part 类型、P2 prompts、是否追问、回答内容进行逐题反馈
- 避免每题重复通用表达
- 对 Part 1 / Part 2 / Part 3 使用不同答题策略

当前逐题反馈 schema：

```json
{
  "question": "string",
  "issue": "string",
  "suggestion": "string",
  "answerFramework": "string",
  "contentGap": "string",
  "sampleUpgrade": "string",
  "usefulPhrases": ["string"]
}
```

如果 DeepSeek 请求失败：

- 报告页显示页面内错误提示
- 保留本地启发式评分
- 用户可重新生成 DeepSeek 反馈

## 9. 部署流程

当前部署方式：

- GitHub 仓库：`afterDDL/speakeasy`
- Cloudflare Pages 自动部署
- Push 到 `main` 后自动触发构建

Cloudflare 构建配置：

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

部署前检查：

```bash
npm run build
```

本项目使用便携 Node：

```text
.tools/node-v24.16.0-win-x64
```

在当前机器上可用：

```powershell
.\.tools\node-v24.16.0-win-x64\npm.cmd run build
```

## 10. 内测建议流程

推荐测试环境：

- Android Chrome / Edge
- 桌面 Chrome / Edge

不稳定环境：

- iPhone Safari
- 微信/QQ 内置浏览器
- 部分移动端国产浏览器

内测重点：

- 麦克风权限是否正常
- 语音转写是否成功
- 考官朗读是否正常
- 隐藏题目是否提升沉浸感
- 完整模拟流程是否清楚
- 单题练习是否好找
- AI 逐题反馈是否有针对性
- 报告页“重答此题”是否形成复练闭环
- 手机端排版是否舒服

建议反馈格式：

```text
设备：
浏览器：
测试模式：Part 1 / Part 2 / Part 3 / 完整模拟 / 单题练习
语音识别：正常 / 失败，提示是：
考官读题：正常 / 失败，情况是：
AI 报告：有用 / 一般 / 没用，原因是：
手机排版问题：
其他建议：
```

## 11. 已知限制

- SpeechRecognition 不稳定，`network` / `aborted` 很难完全避免
- Pronunciation 评分目前只能参考，不能做音素级分析
- 用户历史和题库不跨设备同步
- 没有账号系统
- 没有云端题库管理后台
- 浏览器语音合成无法 100% 固定声音性别和口音
- DeepSeek 评分质量依赖 prompt、模型稳定性和回答内容长度

## 12. 后续迭代方向

优先级较高：

- 商业 ASR 或后端转写，提升语音识别稳定性
- 报告页继续优化逐题反馈质量
- “重答此题”后的前后对比
- 题目掌握度统计：已练、待练、重复错误题
- Part 1 / Part 2 / Part 3 练习进度可视化

中期方向：

- 登录系统
- 云端历史同步
- 云端题库管理
- 用户自定义练习计划
- 根据弱项自动推荐下一组题

作品集方向：

- 增加项目介绍落地页
- 加入产品截图与架构图
- 增加开发日志
- 添加 demo 视频或图文说明

## 13. 维护注意事项

- 不要把 DeepSeek API Key 写入 GitHub
- 线上 Key 只放 Cloudflare Pages 环境变量
- 改动 AI prompt 时需要同步：
  - `src/lib/scoring.js`
  - `functions/api/score.js`
- 改题库源文件会影响所有用户默认题库
- 用户在 UI 中导入/编辑题库只影响当前浏览器
- 语音相关问题优先判断浏览器、权限、网络和代理，不要直接当作代码问题
- 推送失败时通常是 GitHub 网络/代理问题，可检查是否开启全局代理

