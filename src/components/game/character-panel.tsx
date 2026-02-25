/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, SCENES, getAvailableCharacters, getStatLevel, PLAYER_STAT_METAS
 * [OUTPUT]: 对外提供 LeftPanel 组件（场景+角色立绘+分组数值+玩家数值+角色列表）
 * [POS]: 镜花缘 PC 端左侧面板，4 NPC，按 category 分组渲染数值条，隐藏属性不显示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES, getAvailableCharacters, getStatLevel, PLAYER_STAT_METAS } from '@/lib/store'

// ── 场景卡片 — 16:9 ────────────────────────────────────

function SceneCard() {
  const currentScene = useGameStore((s) => s.currentScene)
  const scene = SCENES[currentScene]

  return (
    <div className="jh-card jh-scene-card">
      {scene?.background ? (
        <img src={scene.background} alt={scene.name} />
      ) : (
        <div className="jh-placeholder" style={{ background: 'linear-gradient(135deg, #1a1520 0%, #0d0d1a 100%)' }}>
          <span className="jh-placeholder-icon">🏠</span>
        </div>
      )}
      <div className="jh-scene-tag">
        <span style={{ fontSize: 14 }}>{scene?.icon || '📍'}</span>
        {scene?.name || '未知场景'}
      </div>
    </div>
  )
}

// ── 场景选择器 — 带解锁判定 ─────────────────────────────

function SceneSelector() {
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)

  return (
    <div className="jh-card">
      <div className="jh-scene-selector">
        {Object.entries(SCENES).map(([id, scene]) => {
          const active = currentScene === id
          const isLocked = scene.unlockCondition && !unlockedScenes.includes(id)
          return (
            <button
              key={id}
              className={`jh-scene-item${active ? ' active' : ''}${isLocked ? ' locked' : ''}`}
              onClick={() => !isLocked && selectScene(id)}
            >
              <span style={{ fontSize: 14 }}>{scene.icon}</span>
              {scene.name}
              {isLocked && <span style={{ marginLeft: 'auto', fontSize: 11 }}>🔒</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 角色立绘 — 3:4 ─────────────────────────────────────

function PortraitCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <div className="jh-card jh-portrait-card">
      {char ? (
        <img src={char.fullImage} alt={char.name} />
      ) : (
        <div className="jh-placeholder" style={{ background: 'linear-gradient(180deg, #1a1520 0%, #0d0d1a 100%)' }}>
          <span className="jh-placeholder-icon">👤</span>
          <span className="jh-placeholder-text">选择角色开始</span>
        </div>
      )}
    </div>
  )
}

// ── 数值条 — 通用复用 ──────────────────────────────────

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 12, width: 16, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(232,67,147,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

// ── 角色信息 — 按 category 分组，隐藏属性过滤 ──────────

const categories = ['relation', 'status'] as const
const categoryLabels: Record<string, string> = { relation: '关系', status: '状态' }

function InfoCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const char = currentCharacter ? characters[currentCharacter] : null

  if (!char) return null

  const stats = characterStats[char.id]
  const level = getStatLevel(stats?.affection ?? 0)

  const grouped = categories
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      metas: char.statMetas.filter((m) => m.category === cat && !m.hidden),
    }))
    .filter((g) => g.metas.length > 0)

  return (
    <div className="jh-card jh-info-card">
      <div className="jh-info-title">
        {char.name}
        <span style={{ fontSize: 11, fontWeight: 400, color: level.color, marginLeft: 8 }}>
          {level.name}
        </span>
      </div>
      <div className="jh-info-meta">
        <span>{char.age}岁</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{char.title}</span>
      </div>
      <div className="jh-info-desc">{char.description}</div>

      {stats && grouped.map((group) => (
        <div key={group.category} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
            {group.label}
          </div>
          {group.metas.map((meta) => (
            <StatBar key={meta.key} label={meta.label} value={stats[meta.key] ?? 0} color={meta.color} icon={meta.icon} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── 玩家全局数值 — 真心/业障/自信 + 红包累计 ───────────

function PlayerStatsCard() {
  const playerStats = useGameStore((s) => s.playerStats)
  const giftValue = useGameStore((s) => s.giftValue)

  return (
    <div className="jh-card jh-info-card">
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>📊 玩家数值</div>
      {PLAYER_STAT_METAS.map((m) => (
        <StatBar
          key={m.key}
          label={m.label}
          value={playerStats[m.key as keyof typeof playerStats]}
          color={m.color}
          icon={m.icon}
        />
      ))}
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>
        💰 红包累计: ¥{giftValue.toLocaleString()}
      </div>
    </div>
  )
}

// ── 角色列表 — 4 NPC，显示首个可见数值 ─────────────────

function CharacterList() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentDay = useGameStore((s) => s.currentDay)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)

  const available = getAvailableCharacters(currentDay, characters)

  return (
    <div className="jh-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>角色</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {Object.keys(available).length}人
        </span>
      </div>
      <div className="jh-char-list" style={{ flex: 1 }}>
        {Object.entries(available).map(([charId, char]) => {
          const stats = characterStats[charId]
          const firstVisible = char.statMetas.find((m) => !m.hidden)
          const firstValue = stats?.[firstVisible?.key ?? ''] ?? 0

          return (
            <button
              key={charId}
              className={`jh-char-item ${currentCharacter === charId ? 'active' : ''}`}
              onClick={() => selectCharacter(currentCharacter === charId ? null : charId)}
            >
              <span style={{ flex: 1, color: currentCharacter === charId ? char.themeColor : undefined }}>
                {char.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {firstVisible?.icon}{firstValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 左侧面板主组件 ─────────────────────────────────────

export default function LeftPanel() {
  return (
    <div
      className="jh-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 0 12px 12px',
        height: '100%',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }}
    >
      <SceneCard />
      <SceneSelector />
      <PortraitCard />
      <InfoCard />
      <PlayerStatsCard />
      <CharacterList />
    </div>
  )
}
