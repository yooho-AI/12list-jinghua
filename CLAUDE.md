# 镜花缘 — 上海都市社交悬疑心理博弈

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
12list-jinghua/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 4 角色立绘 9:16 竖版
│   └── scenes/                  - 5 场景背景 9:16 竖版
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明 + *.md?raw
│   ├── App.tsx                  - 根组件: 三阶段开场(APP启动→NPC档案卡→玩家注册) + GameScreen + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 4角色 + 5场景 + 8道具 + 4章节 + 5事件 + 6结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/换日) + 抽屉状态 + StoryRecord + Analytics + 双轨解析
│   │   ├── parser.ts            - AI 回复解析（4角色着色 + 数值着色 + 选项提取 + marked Markdown渲染）
│   │   ├── analytics.ts         - Umami 埋点（jh_ 前缀，已集成到 store/App）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - 背景音乐（useBgm hook + initBGM/toggleBGM 独立函数）
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（jh- 前缀，暗色都市主题）
│   │   ├── opening.css          - 开场样式：APP启动画面 + NPC约会档案 + 玩家注册
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 日变卡 + 档案卡 + NPC气泡 + DashboardDrawer + RecordSheet + SVG关系图 + Toast
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header(Day+时段+章节+🎵+☰) + 三向手势 + Tab路由 + TabBar(5键) + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 镜花手账(左抽屉)：扉页+玩家属性+角色轮播+场景缩略图+章节目标+道具格+迷你播放器。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话 Tab：富消息路由(SceneCard/DayCard/NPC头像气泡) + CollapsibleChoices + 背包 + 输入区
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 描述 + 地点列表
│       └── tab-character.tsx    - 人物 Tab：立绘 + 玩家属性 + NPC好感 + SVG RelationGraph + 角色网格 + CharacterDossier 全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **上海都市社交悬疑**：4 NPC（沈清让/顾临渊/林小鹿/陆沉舟）× 心理博弈 × 情感操控
- **三轨数值**：角色 StatMeta (relation 3维 + hidden) + 玩家属性 (sincerity/karma/confidence) + 全局资源 (giftValue)
- **暗色都市主题**：深紫底(#0d0d1a)+都市粉(#e84393)+薰衣草(#a29bfe)，jh- CSS 前缀
- **6 时段制**：每天 6 时段（清晨/上午/中午/下午/傍晚/深夜），30天 × 6行动点
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **6 结局**：BE×2 + TE×1 + HE×2 + NE×1，优先级 BE→TE→HE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| LandingScreen | App.tsx | 开场Phase0 | 暗色霓虹+粒子+Logo+脉冲CTA |
| ProfileCards | App.tsx | 开场Phase1 | 约会APP风格NPC档案卡片自动播放 |
| RegisterCard | App.tsx | 开场Phase2 | 暗色毛玻璃表单+霓虹粉边框 |
| DashboardDrawer | dashboard-drawer | Header+右滑手势 | 暗色毛玻璃左抽屉：扉页+属性+轮播+场景+目标+道具+音乐。Reorder拖拽 |
| RecordSheet | app-shell | Header+左滑手势 | 右侧滑入事件记录：时间线倒序+粉色圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩 |
| DayCard | tab-dialogue | 换日 | 日历撕页风弹簧落入+逐字打字机(80ms) |
| CollapsibleChoices | tab-dialogue | AI回复后 | 收起态GameController按钮+展开态A/B/C/D卡片 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+4NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+好感阶段+数值条 |
| MiniPlayer | dashboard-drawer | 手账内 | 播放/暂停+5根音波柱动画 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧镜花手账
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮同等触发
- 手账内组件支持拖拽排序（Reorder + localStorage `jh-dash-order` 持久化）

## Store 状态扩展

- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceTime 自动追加）
- `choices: string[]` — AI 返回的选项（extractChoices 提取或保底生成）
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `day-change` → DayCard（advanceTime 换日时触发）
- NPC 消息带 `character` 字段 → 32px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx/store.ts 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackEndingReached` → store.ts checkEnding
- `trackSceneUnlock` → store.ts selectScene

## 法则

- StatMeta hidden 属性 UI 过滤 `!m.hidden`，AI prompt 内部使用
- parseStatChanges 返回 `{ charChanges, globalChanges }` 双轨结果，GLOBAL_ALIASES 映射中文标签
- checkEnding 优先级：BE(karma≥90) → BE(sincerity≤10) → TE(陆沉舟线) → HE(真爱/自我) → NE(兜底)
- advanceTime 顺序：日常消耗 → 章节推进 → 强制事件 → 结局检查
- EndingModal 双按钮：「重新开始」(clearSave+resetGame) + 「继续探索」(仅清除 endingType)
- 零修改文件：stream.ts / hooks.ts / main.tsx / vite.config.ts / tsconfig*.json / worker/index.js
- 存档键：jinghua-save-v1
- CSS 前缀：jh-
- 统计前缀：jh_

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
