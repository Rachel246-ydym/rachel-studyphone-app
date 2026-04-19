# CLAUDE.md — Rachel Study Phone App

> 快速参考文档，帮助 Claude 在新对话中立即理解本项目。

---

## 项目简介

这是一个**手机模拟器 PWA**，专为用户"京京"（备考 2027 年研究生联考的学生）设计。核心玩法是通过与 AI 角色**江浔**（18 岁，内敛温柔，家境殷实）的日常互动模拟"伴读男友"体验，同时追踪学习进度、生活开销、购物、地图等。

- **用户**：京京（Rachel），中文界面
- **AI 角色**：江浔（`jiangxun`），角色设定详见 `services/ai.ts` 的 `JIANGXUN_SYSTEM_PROMPT`
- **AI 服务**：DeepSeek API（`deepseek-chat` 或 `deepseek-reasoner`）
- **数据持久化**：全部存 `localStorage`，支持 JSON 导出/导入

---

## 技术栈

| 技术 | 版本 | 用途 |
|---|---|---|
| React | 19.2 | UI 框架 |
| TypeScript | 6.0 | 类型安全 |
| Vite | 8.0 | 构建工具 |
| lucide-react | 1.8 | 图标库 |
| DeepSeek API | — | AI 对话 |
| OpenMeteo API | — | 南京实时天气（无需 key） |

构建命令：
```bash
cd app
npm install
npm run dev        # 开发服务器
npm run build      # 类型检查 + 生产构建
npx tsc -p tsconfig.app.json --noEmit  # 仅类型检查
```

---

## 文件结构

```
rachel-studyphone-app/
├── CLAUDE.md                    # 本文件
├── app/
│   ├── public/
│   │   ├── manifest.json        # PWA 配置（名称 "手机模拟器"，主题色 #4CAF7D）
│   │   └── sw.js                # Service Worker
│   └── src/
│       ├── main.tsx             # React 入口
│       ├── App.tsx              # 路由容器，挂载全局 hooks
│       ├── types/
│       │   └── index.ts         # 所有 TypeScript 类型定义（单一来源）
│       ├── store/
│       │   └── AppContext.tsx   # useReducer + Context（60+ action types），自动 localStorage 持久化
│       ├── services/
│       │   ├── ai.ts            # callAI()，江浔/自定义角色 prompt 构建，地点提取
│       │   ├── storage.ts       # localStorage 读写/导出/导入/清除
│       │   └── weather.ts       # OpenMeteo 天气（南京玄武），20 分钟缓存
│       ├── utils/
│       │   └── prompts.ts       # 静态数据：商品列表、成就列表、数学讲次、里程碑日期
│       ├── hooks/
│       │   ├── useAutoMessages.ts   # 江浔定时主动发消息（5 分钟轮询，45 分钟冷却）
│       │   └── useAutoMoments.ts    # 江浔自动发朋友圈/虚拟空间备忘；自定义角色主动聊天
│       ├── components/
│       │   ├── Sidebar/         # 页面导航，支持拖拽排序，未读红点
│       │   └── StatusBar/       # 时间 + 天气，顶部状态栏
│       └── pages/
│           ├── WeChat/          # 聊天模块（见下方详细说明）
│           ├── VirtualSpace/    # 日历日记 + 足迹 + 经期追踪 + 记忆库
│           ├── Library/         # TXT 书籍阅读器，书签，AI 点评
│           ├── Map/             # 校园地图，江浔行动轨迹
│           ├── Shopping/        # 购物车，结算，AI 反应
│           ├── Accounting/      # 收支账本，分类统计
│           ├── ExamSimulator/   # 考研学习计划追踪（见下方详细说明）
│           └── Settings/        # API Key，模型选择，数据管理
```

---

## 状态管理

**架构**：单一 `AppState` + `useReducer`，通过 `AppContext` 全局共享。

```typescript
// 取状态和 dispatch
const { state, dispatch } = useApp();

// 常用 dispatch 示例
dispatch({ type: 'ADD_MESSAGE', payload: msg });
dispatch({ type: 'SET_STATE', payload: { receipts: [...] } }); // 任意字段补丁
dispatch({ type: 'ADD_HAIBI', payload: { target: 'user', amount: 10 } });
dispatch({ type: 'SET_ACTIVE_PAGE', payload: 'shopping' });
```

`SET_STATE` 是万能补丁 action，可直接覆盖 state 中任意字段，适合没有专用 action 的一次性更新。

---

## AI 服务 (`services/ai.ts`)

### 核心函数

```typescript
callAI(apiKey, model, messages): Promise<string>
// 调用 DeepSeek，temperature 0.85，max_tokens 800，返回文本或 "[错误信息]"
```

### Prompt 构建函数

| 函数 | 用途 | 输出限制 |
|---|---|---|
| `buildJiangxunMessages(history, status, extra, memories)` | 江浔主聊天 | 完整 messages 数组 |
| `buildCharacterMessages(char, history, contacts, msgs)` | 自定义角色聊天 | 完整 messages 数组 |
| `buildMapEventPrompt(hour)` | 生成江浔位置动作 | 约 15 字 |
| `buildBookCommentPrompt(text, title)` | 书签 AI 点评 | 50 字以内 |
| `buildAccountingReactionPrompt(desc, amount, type)` | 记账反应 | 20 字以内 |
| `buildShoppingCartReactionPrompt(name, category)` | 加购物车反应 | 15-25 字 |
| `buildShoppingCheckoutPrompt(items, total, payer)` | 结算点评 | 40 字以内 |
| `buildJiangxunMemoPrompt(kind)` | 虚拟空间备忘 | 30-60 字 |
| `buildJiangxunImprintPrompt(content)` | 江浔在用户日记留印记 | 15-30 字 |

### 地点提取

```typescript
extractLocationFromText(text: string): string | null
// 从 AI 回复里匹配地名关键词，用于自动写入 MapEvent
```

### 记忆注入

```typescript
// buildJiangxunMessages() 内部调用
renderMemories(memories, charId): string
// 将 MemoryEntry[] 格式化成 prompt 片段注入系统提示
// 星标记忆始终包含，非星标最近 10 条
```

---

## 主要模块说明

### WeChat 模块 (`pages/WeChat/`)

| 文件 | 职责 |
|---|---|
| `WeChat.tsx` | 视图路由（list / chat / moments / homework / characters / memories） |
| `ChatList.tsx` | 联系人列表，未读徽章 |
| `ChatRoom.tsx` | 聊天室（最复杂的文件，~600 行） |
| `Moments.tsx` | 朋友圈发布与互动 |
| `HomeworkBoard.tsx` | 作业板，7 天后自动删除完成项 |
| `CharacterManager.tsx` | 创建/编辑 AI 角色和群聊 |
| `MemoryManager.tsx` | 手动记忆库（4 类别，可星标） |

**ChatRoom.tsx 关键逻辑**：
- 密码群聊：接受自定义密码、`0921`（江浔生日）、`0709`（京京生日）；3 次失败 session-only 自动解锁（`sessionUnlocked: true`，非永久）
- 购物关键词触发：检测到"购物/买东西"等词 → 插入含跳转按钮的系统消息（`__SHOPPING_PROMPT__`标记）
- 地点提取：江浔回复后调用 `extractLocationFromText()` → 自动写入 MapEvent
- 故事回放：多选消息 → 保存为 StoryReplay 进入 VirtualSpace

### ExamSimulator 模块 (`pages/ExamSimulator/`)

**计划时间线**：
- 开始：`2026-04-01`（`PLAN_START`）
- CET6 截止：`2026-06-13`（之后英语切换为考研英语模式）
- 考试日：`2026-12-19`（`EXAM_DATE`）

**数学讲次映射**：张宇高数基础 30 讲（实际 18 讲），按权重分配到约 100 天，`mathLectureAt(dayOffset)` 通过累计权重数组 O(1) 查找当天讲次。

**英语**：每天 4 个子任务（单词/听力/阅读/写作or翻译），CET6 前后题型不同。

**补卡机制**：`makeup: true` 的任务完成后给一半奖励，不更新连续打卡，不发江浔消息。

**每日任务生成**：`buildDailyTasks(dateStr)` → 数学 + 英语（4 个）+ 政治（7/1 后）+ 专业课（4/20 后）。

**成就系统**：20 个成就，解锁后发江浔聊天消息 + 朋友圈。

### VirtualSpace 模块 (`pages/VirtualSpace/`)

- **Tabs**：日记 / 经期 / 记忆库
- **日记**：每日用户或江浔写条目；用户条目可"请江浔留印记"（AI 生成 `jiangxunImprint`）；江浔条目可重写（AI 重生成）
- **经期**：点击日期弹出菜单（开始/结束/撤销），视觉高亮
- **记忆库**：密码锁（`0921` / `0709`），3 次失败 session-only 自动解锁，只读展示所有 memories

---

## 海币系统（虚拟货币）

| 来源 | 数量 |
|---|---|
| 每日学习任务 | 3-8 海币 |
| 成就解锁 | 10-200 海币 |
| 江浔发红包 | 2-11 海币（随机）或自动补差额 |

江浔账户余额 `jiangxunHaibi` 初始 9999，实际无限。用户余额不足时结算会触发江浔自动发红包。

---

## 自动行为 Hooks

### useAutoMessages（每 5 分钟轮询）
- 08:00–23:30 有效，45 分钟冷却，25% 概率触发
- 有 API Key：AI 生成（含天气/时间上下文）；无：固定备选语句
- 8% 概率发小红包（2-11 海币），3% 概率发位置卡片
- 受 `char.autoEnabled` 门控（自定义角色）

### useAutoMoments（每 10 分钟轮询）
- 江浔朋友圈：1-7 小时随机间隔
- 江浔虚拟空间备忘：12-20 小时间隔
- 自定义角色主动聊天：每角色 2-6 小时，20% 概率
- 江浔对用户帖子点赞/评论（12 小时内的帖子）

---

## 关键类型速查

```typescript
// types/index.ts 全部从此导入
import type { AppState, ChatMessage, VirtualSpaceEntry, StudyTask, ... } from '../../types';

// 关系状态
type RelationshipStatus = 'friend' | 'lover';

// AI 模型
type AIModel = 'deepseek-chat' | 'deepseek-reasoner';

// 聊天消息类型
type ChatMessage.type = 'text' | 'action' | 'red-packet' | 'location' | 'system';

// 任务主科目
type StudyTask.subject = 'math' | 'english' | 'professional' | 'politics';

// 英语子类型
type StudyTask.englishSubtype = 'words' | 'listening' | 'reading' | 'writing';
```

---

## 开发规范（从现有代码总结）

### 代码风格
- **函数组件** + hooks，无 class 组件
- **TypeScript 严格模式**，所有 props/state 有类型，禁用 `any`
- **导入顺序**：React → 第三方库 → 本地 store/types/services/hooks → 样式
- **事件处理**：以 `handle` 开头的内联函数（`handleSend`、`handleClose`）；副作用异步操作以 `fire` 开头（`fireCartReaction`、`fireCheckoutComment`）
- **组件命名**：PascalCase；CSS 类名：kebab-case BEM 风格（`chat-room`、`message-content`）

### 状态更新
- 始终通过 `dispatch` 更新，不直接 mutate state
- 一次性/无专用 action 的更新用 `SET_STATE`
- 异步 AI 调用后的状态更新：先 `dispatch` 创建占位，再 `dispatch` 更新结果

### AI 调用规范
- 所有 AI 调用前检查 `state.apiKey`，无 key 则静默返回
- 回复以 `[` 开头视为错误，跳过
- 用户可见回复截断至合理长度（聊天 60-80 字，反应 20-40 字）
- 节流：购物车反应 15 秒冷却（`lastReactionRef`）

### CSS 规范
- 每个页面有对应 `.css`，通过 CSS 变量共享颜色（`--primary`、`--text`、`--border` 等）
- 主色：`#4CAF7D`（绿），危险色：`#ef4444`（红）
- 移动优先，768px 断点

### 注释规范
- 仅在"为什么"不显而易见时写注释（隐藏约束、绕过特定 bug）
- 不写解释"做什么"的注释，不写 TODO 占位

---

## 已知问题与待改进

1. **ExamSimulator 数学映射**：`mathLectureAt()` 用累计权重数组假设 18 讲对应约 100 天，如果 `PLAN_START` 到 `EXAM_DATE` 之间天数差异较大，讲次分配可能偏移
2. **AI 回复截断**：部分场景（购物车反应 `slice(0,60)`）可能截断中文在标点中间
3. **群聊 AI**：自定义角色在群聊中的跨账号检测（`buildCharacterMessages` 内 30% 概率 hint）目前是随机的，无持久记忆
4. **localStorage 上限**：书库全文存入 localStorage，TXT 文件过大时（>5MB）可能超限
5. **WeChat 图片**：头像上限 256×256，朋友圈图片上限 1024×1024，但无明确文件大小校验错误提示
6. **Service Worker**：`sw.js` 是最小实现，离线功能有限
7. **密码明文**：群聊密码以明文存于 `state.contacts[].password`（模拟器场景，非安全需求）

---

## 开发分支约定

当前活跃功能分支：`claude/continue-phone-simulator-pwa-KKn46`  
稳定基线分支：`claude/fix-mobile-layout-cutoff-DwoVP`  
主分支：`main`

新功能开发在 `claude/continue-*` 类分支，完成后提 PR 合并到 main。

## 当前开发优先级

1. UI 整体风格升级（提升视觉精致感，参考现代 iOS 风格）
2. 聊天模块体验优化
3. 考研进程模块完善（后续补充线代、概率论分册数据）
4. 功能 bug 修复

## 重要开发原则

- 每次只改一个模块，不要大范围重构
- 直接在 main 分支上 commit，不新建分支
- 改动后确保 `npm run build` 无报错
