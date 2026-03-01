# lib/ — 核心逻辑层

L2 | 父级: /12list-jinghua/CLAUDE.md

## 成员清单

- `script.md`: ★剧本直通，五模块原文（故事线/机制/人物/场景/道具），?raw 直注 prompt
- `data.ts`: ★种子文件，全部类型定义 + 4角色(hidden stat支持)/5场景(解锁机制)/8道具(scene-key)/4章节/强制事件/6结局 + PLAYER_STAT_METAS + QUICK_ACTIONS + StoryRecord/Message 富类型
- `store.ts`: ★种子文件，Zustand+Immer 状态管理，script.md ?raw 直通/buildSystemPrompt/parseStatChanges(GLOBAL_ALIASES双轨)/checkEnding(BE→TE→HE→NE)/advanceTime/sendMessage(SSE流式+extractChoices) + 抽屉状态 + StoryRecord + Analytics 集成
- `parser.ts`: AI 回复解析，marked Markdown渲染 + extractChoices 选项提取 + 4角色名着色 + 全部数值标签着色 + charColor 检测
- `analytics.ts`: Umami 埋点，jh_ 前缀，8个追踪函数
- `stream.ts`: ☆零修改，SSE 流式通信
- `bgm.ts`: 背景音乐控制（useBgm hook + initBGM/toggleBGM 独立函数）
- `hooks.ts`: ☆零修改，useMediaQuery / useIsMobile

## 依赖关系

- `store.ts` → `data.ts` + `stream.ts` + `parser.ts` + `analytics.ts` + `script.md`（单向）
- `parser.ts` 独立（不 import data.ts，避免循环依赖，手动同步 CHARACTER_COLORS）
- `analytics.ts` 独立（Umami SDK）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
