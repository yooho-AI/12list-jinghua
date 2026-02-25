/**
 * [INPUT]: 依赖 @/lib/store, @/lib/hooks, @/lib/bgm, framer-motion, 游戏组件
 * [OUTPUT]: 对外提供 App 根组件（独立 SPA，无路由依赖）
 * [POS]: 镜花缘项目入口，StartScreen ↔ GameScreen 状态切换
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, PERIODS, MAX_DAYS, PLAYER_STAT_METAS } from '@/lib/store'
import { useIsMobile } from '@/lib/hooks'
import { useBgm } from '@/lib/bgm'
import DialoguePanel from '@/components/game/dialogue-panel'
import LeftPanel from '@/components/game/character-panel'
import RightPanel from '@/components/game/side-panel'
import MobileGameLayout from '@/components/game/mobile-layout'
import '@/styles/globals.css'

// ============================================================
// NPC 预览数据 — 开始画面用，与 store 解耦
// ============================================================

const NPC_PREVIEW = [
  { id: 'qingrang', name: '沈清让', color: '#a29bfe', icon: '🎨', role: '温柔艺术家' },
  { id: 'linyuan', name: '顾临渊', color: '#e17055', icon: '💼', role: '霸道总裁' },
  { id: 'xiaolu', name: '林小鹿', color: '#00b894', icon: '🦌', role: '阳光学弟' },
  { id: 'chenzhou', name: '陆沉舟', color: '#74b9ff', icon: '🍵', role: '神秘大叔' },
] as const

// ============================================================
// 结局类型映射 — 消除 if/else 分支
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#e84393', icon: '🌟' },
  BE: { label: '💀 Bad Ending', color: '#6b7280', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ============================================================
// 故事信息 — 用于开始画面
// ============================================================

const STORY_INFO = {
  title: '镜花缘',
  subtitle: '都市情感博弈交互叙事游戏',
  intro: '你刚经历了一段五年的感情——未婚夫在婚礼前三个月劈腿。带着千疮百孔的心，你下载了高端交友APP「镜花缘」...',
  objectives: [
    '🌹 路线A·寻找真爱：找到那个"对的人"，让他敞开心扉',
    '💰 路线B·情感投资：通过"情感操控"获取总价值50万的回报',
    '🦋 路线C·自我救赎：不追求外部目标，治愈自己的内心创伤',
  ],
}

// ============================================================
// 开始界面 — 暗色都市情感风
// ============================================================

function StartScreen() {
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const { toggle, isPlaying } = useBgm()

  const [name, setName] = useState('')

  const handleStart = () => {
    setPlayerInfo(name || '玩家')
    initGame()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1520] to-[#0d0d1a]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg px-6 text-center"
      >
        {/* 标题 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mb-6 text-5xl"
        >
          💋
        </motion.div>
        <h1 className="mb-2 text-2xl font-bold text-[#f0f0ff]">{STORY_INFO.title}</h1>
        <p className="mb-1 text-sm text-[#e84393]/80">{STORY_INFO.subtitle}</p>
        <p className="mb-8 text-xs leading-relaxed text-[#8888aa]">{STORY_INFO.intro}</p>

        {/* 名字输入 — 固定女性，无性别选择 */}
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字..."
            maxLength={8}
            className="w-full max-w-[240px] rounded-lg border px-4 py-2 text-center text-sm outline-none transition-all"
            style={{
              background: 'rgba(13, 13, 26, 0.8)',
              borderColor: 'rgba(232, 67, 147, 0.25)',
              color: '#f0f0ff',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#e84393' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(232, 67, 147, 0.25)' }}
          />
        </div>

        {/* NPC 预览 */}
        <div className="mb-8 flex justify-center gap-4">
          {NPC_PREVIEW.map((npc, i) => (
            <motion.div
              key={npc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-[72px] text-center"
            >
              <div
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg"
                style={{
                  border: `2px solid ${npc.color}`,
                  background: `${npc.color}18`,
                }}
              >
                {npc.icon}
              </div>
              <div className="text-xs font-medium text-[#f0f0ff]">{npc.name}</div>
              <div className="text-[10px] text-[#8888aa]">{npc.role}</div>
            </motion.div>
          ))}
        </div>

        {/* 路线提示 */}
        <div className="mb-6 text-left">
          {STORY_INFO.objectives.map((obj) => (
            <p key={obj} className="mb-1 text-[11px] leading-relaxed text-[#8888aa]">{obj}</p>
          ))}
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full rounded-full px-8 py-3 text-sm font-medium text-white shadow-lg transition-shadow"
            style={{
              background: 'linear-gradient(135deg, #e84393 0%, #c2185b 100%)',
              boxShadow: '0 4px 16px rgba(232, 67, 147, 0.3)',
            }}
          >
            进入镜花缘
          </motion.button>

          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadGame()}
              className="w-full rounded-full border px-8 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: 'rgba(232, 67, 147, 0.2)',
                color: '#8888aa',
              }}
            >
              继续游戏
            </motion.button>
          )}
        </div>

        {/* 音乐按钮 */}
        <button
          onClick={(e) => toggle(e)}
          className="mt-4 text-xs text-[#555577] transition-colors hover:text-[#8888aa]"
        >
          {isPlaying ? '🔊 音乐开' : '🔇 音乐关'}
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 顶部状态栏 — 天数 + 时段 + 玩家属性 + 红包
// ============================================================

function HeaderBar({ onMenuClick }: { onMenuClick: () => void }) {
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const playerStats = useGameStore((s) => s.playerStats)
  const giftValue = useGameStore((s) => s.giftValue)
  const { toggle, isPlaying } = useBgm()

  const period = PERIODS[currentPeriodIndex]

  return (
    <header
      className="relative z-10 flex min-h-[44px] items-center justify-between gap-2 px-4 py-2"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 左侧：天数 + 时段 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
          💋 第{currentDay}天/{MAX_DAYS}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {period?.icon} {period?.name}
        </span>
      </div>

      {/* 右侧：玩家属性 + 红包 + 音乐 + 菜单 */}
      <div className="flex items-center gap-1">
        {PLAYER_STAT_METAS.map((m) => (
          <span
            key={m.key}
            className="rounded-md px-2 py-1 text-xs"
            style={{ color: m.color }}
            title={m.label}
          >
            {m.icon}{playerStats[m.key as keyof typeof playerStats]}
          </span>
        ))}

        <span className="rounded-md px-2 py-1 text-xs" style={{ color: '#ffd700' }}>
          💰¥{giftValue.toLocaleString()}
        </span>

        <button
          onClick={(e) => toggle(e)}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          title={isPlaying ? '关闭音乐' : '开启音乐'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        <button
          onClick={onMenuClick}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,67,147,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          title="菜单"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

// ============================================================
// 菜单弹窗
// ============================================================

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="jh-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="jh-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}
        >
          游戏菜单
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="jh-modal-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="jh-modal-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="jh-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="jh-modal-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
          <button className="jh-modal-btn" onClick={onClose}>▶️ 继续游戏</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// 结局弹窗 — 数据驱动，无 if/else
// ============================================================

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <div className="jh-ending-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="jh-ending-modal"
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {meta.icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, marginBottom: 8, letterSpacing: 2 }}>
          {meta.label}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: 1 }}>
          {ending.name}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {ending.description}
        </p>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '10px 32px',
            borderRadius: 99,
            border: 'none',
            background: 'linear-gradient(135deg, #e84393 0%, #c2185b 100%)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232, 67, 147, 0.3)',
          }}
        >
          返回标题
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 通知
// ============================================================

function Notification({ text, type }: { text: string; type: string }) {
  return (
    <div className={`jh-notification ${type}`}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>{text}</span>
    </div>
  )
}

// ============================================================
// PC 游戏主屏幕 — 三栏布局
// ============================================================

function GameScreen() {
  const [showMenu, setShowMenu] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: string } | null>(null)
  const endingType = useGameStore((s) => s.endingType)

  const showNotif = useCallback((text: string, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 2000)
  }, [])
  void showNotif

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: 'var(--bg-secondary)', fontFamily: 'var(--font)' }}
    >
      <HeaderBar onMenuClick={() => setShowMenu(true)} />

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0">
          <LeftPanel />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DialoguePanel />
        </section>
        <aside className="shrink-0">
          <RightPanel />
        </aside>
      </main>

      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>

      {endingType && <EndingModal />}

      <AnimatePresence>
        {notification && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Notification text={notification.text} type={notification.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// App 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const isMobile = useIsMobile()

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-screen"
        >
          {isMobile ? <MobileGameLayout /> : <GameScreen />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
