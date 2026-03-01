# components/game/ — 游戏UI组件层

L2 | 父级: /12list-jinghua/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 桌面居中壳 + Header(Day+时段+章节+🎵+☰) + 三向手势(dx>60px) + Tab路由(AnimatePresence) + TabBar(5键: Notebook/ChatCircleDots/MapTrifold/Users/Scroll) + DashboardDrawer + RecordSheet(右滑入时间线) + Toast
- `dashboard-drawer.tsx`: 镜花手账(左抽屉)：扉页+玩家属性Pills+角色横向轮播+场景缩略图+章节目标+道具网格+迷你播放器。Reorder拖拽排序 + localStorage `jh-dash-order` 持久化
- `tab-dialogue.tsx`: 对话Tab：富消息路由(LetterCard/SceneCard/DayCard/NpcBubble/PlayerBubble/SystemBubble/StreamingMessage) + CollapsibleChoices(收起/展开/自动收起) + InputArea + InventorySheet
- `tab-scene.tsx`: 场景Tab：9:16大图(Ken Burns) + 场景描述 + 地点列表(locked/unlocked/current)
- `tab-character.tsx`: 人物Tab：当前角色立绘 + 玩家属性面板 + NPC好感列表 + SVG RelationGraph(环形+立绘节点) + 角色网格 + CharacterDossier(全屏右滑+50vh呼吸动画+数值条)

## 依赖关系

- 所有组件 → `store.ts`（通过 useGameStore + re-exported 常量/类型）
- `app-shell.tsx` → `dashboard-drawer.tsx` + `tab-*.tsx`
- `tab-dialogue.tsx` → `parseStoryParagraph`（从 store re-export）
- 全部图标：`@phosphor-icons/react`（Notebook/Scroll/MusicNotes/List/ChatCircleDots/MapTrifold/Users/Backpack/PaperPlaneRight/GameController/CaretUp/CaretDown）
- CSS 前缀：`jh-`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
