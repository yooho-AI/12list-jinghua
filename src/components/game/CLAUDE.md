# components/game/ — 游戏 UI 组件

L2 | 父级: /12list-jinghua/CLAUDE.md

## 成员清单

- `character-panel.tsx`: PC 端左侧面板，场景卡片/角色立绘/角色信息(StatMeta 驱动)/玩家属性(sincerity/karma/confidence)/角色列表
- `dialogue-panel.tsx`: PC 端中间对话面板，LetterCard 介绍信/消息列表/流式消息/输入区+背包入口
- `side-panel.tsx`: PC 端右侧面板，背包(道具使用)/关系总览/导航按钮
- `mobile-layout.tsx`: 移动端全屏布局，MobileHeader/MobileDialogue/MobileInputBar/CharacterSheet/InventorySheet/MobileMenu/EndingSheet/HighlightModal
- `highlight-modal.tsx`: 高光时刻弹窗，5阶段(分析→选择→风格→生成→结果)，主色 #e84393，暗色主题

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore
- `highlight-modal.tsx` 额外依赖 `@/lib/highlight` 全部导出
- `dialogue-panel.tsx` 额外依赖 `@/lib/parser` 的 parseStoryParagraph
- `mobile-layout.tsx` 额外依赖 `@/lib/parser` + `@/lib/bgm` + `highlight-modal`

## 样式约定

- CSS class 前缀: `jh-`
- 主题色: #e84393 (都市粉), 暗色背景 #0d0d1a/#1a1520
- 动画: jh-fadeSlideIn, jh-bounce, jh-ink-pulse

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
