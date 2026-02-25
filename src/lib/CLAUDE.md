# lib/ — 核心逻辑层

L2 | 父级: /12list-jinghua/CLAUDE.md

## 成员清单

- `data.ts`: ★种子文件，全部类型定义 + 4角色(hidden stat支持)/5场景(解锁机制)/8道具(scene-key)/4章节/强制事件/6结局 + PLAYER_STAT_METAS + 工具函数
- `store.ts`: ★种子文件，Zustand+Immer 状态管理，buildSystemPrompt(上海社交悬疑世界观)/parseStatChanges(GLOBAL_ALIASES双轨)/checkEnding(BE→TE→HE→NE)/advanceTime/sendMessage(SSE流式)
- `parser.ts`: AI 回复解析，4角色名着色 + 全部数值标签(含hidden)着色 + 玩家属性着色
- `analytics.ts`: Umami 埋点，jh_ 前缀，8个追踪函数
- `highlight.ts`: 高光时刻 AI 分析 + Ark 图片/视频生成，上海都市noir风格
- `stream.ts`: ☆零修改，SSE 流式通信
- `bgm.ts`: ☆零修改，背景音乐控制
- `hooks.ts`: ☆零修改，useMediaQuery / useIsMobile

## 依赖关系

- `store.ts` → `data.ts` + `stream.ts`（单向）
- `parser.ts` 独立（不 import data.ts，避免循环依赖）
- `highlight.ts` 独立（直接调用 Ark API）
- `analytics.ts` 独立（Umami SDK）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
