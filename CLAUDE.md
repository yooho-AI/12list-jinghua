# 镜花缘 — 上海都市社交悬疑心理博弈

React 19 + Zustand 5 + Immer + Vite 7 + Framer Motion + Cloudflare Workers

## 架构

```
12list-jinghua/
├── worker/           - Cloudflare Worker SSE 代理 (api.yooho.ai)
├── public/
│   ├── audio/        - BGM 音频资源
│   ├── characters/   - 4 角色立绘 (qingrang/linyuan/xiaolu/chenzhou)
│   └── scenes/       - 5 场景背景 (home/gallery/company/campus/tearoom)
├── src/
│   ├── main.tsx      - React 挂载入口
│   ├── App.tsx       - 根组件：开场/游戏/结局三态 + HeaderBar
│   ├── lib/          - 核心逻辑层 (8 文件: data/store/parser/analytics/highlight/stream/bgm/hooks)
│   ├── styles/       - globals.css 暗色水墨主题，jh- 前缀
│   └── components/
│       └── game/     - 5 游戏组件 (character-panel/dialogue-panel/side-panel/mobile-layout/highlight-modal)
├── index.html        - 💋 favicon，镜花缘
├── package.json      - name: jinghua
├── wrangler.toml     - name: jinghua-api
└── vite.config.ts    - Vite 构建配置
```

## 核心设计

- **三轨数值**: 角色 StatMeta (relation 3维 + hidden) + 玩家属性 (sincerity/karma/confidence) + 全局资源 (giftValue)
- **日制时间**: 30天 × 6时段，每天6行动点
- **StatMeta hidden**: 角色隐藏属性 AI 内部追踪，UI 不渲染
- **场景解锁**: 4 场景通过邀请函道具解锁，home 始终可用
- **角色体系**: 4 NPC 共享 relation 3维 (affection/trust/insight) + 各自 hidden 属性
- **6 结局**: BE(社死/心死) / TE(镜中人) / HE(真爱/自我觉醒) / NE(都市猎人)
- **主题色**: #e84393 都市粉，暗色水墨 #0d0d1a/#1a1520
- **CSS 前缀**: jh- (镜花)
- **存档键**: jinghua-save-v1
- **统计前缀**: jh_

## 法则

- StatMeta hidden 属性 UI 过滤 `!m.hidden`，AI prompt 内部使用
- parseStatChanges 返回 `{ charChanges, globalChanges }` 双轨结果，GLOBAL_ALIASES 映射中文标签
- checkEnding 优先级：BE(karma≥90) → BE(sincerity≤10) → TE(陆沉舟线) → HE(真爱/自我) → NE(兜底)
- advanceTime 顺序：日常消耗 → 章节推进 → 强制事件 → 结局检查
- 零修改文件：stream.ts / bgm.ts / hooks.ts / main.tsx / vite.config.ts / tsconfig*.json / worker/index.js
