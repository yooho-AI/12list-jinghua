/**
 * [INPUT]: 依赖 store.ts 状态，styles/*.css
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 根组件: 三阶段开场(APP启动→NPC档案卡→玩家注册) + GameScreen + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, ENDINGS, ENDING_TYPE_MAP, STORY_INFO } from '@/lib/store'
import { trackGameStart, trackGameContinue } from '@/lib/analytics'
import { initBGM } from '@/lib/bgm'
import AppShell from '@/components/game/app-shell'
import './styles/globals.css'
import './styles/opening.css'
import './styles/rich-cards.css'

// ── NPC 档案卡数据 ──────────────────────────────────

const NPC_PROFILES = [
  {
    name: '沈清让', title: '温柔艺术家 · 32岁',
    desc: '画廊策展人，温润如玉的文艺青年。保持距离感的温柔背后，是极度害怕被抛弃的心。',
    portrait: '/characters/qingrang.jpg',
    tags: ['文艺', '温柔', '距离感'],
    color: '#a29bfe',
  },
  {
    name: '顾临渊', title: '霸道总裁 · 35岁',
    desc: '创业公司CEO，霸道自信的掌控者。用强势保护自己，内心是受伤的孩子。',
    portrait: '/characters/linyuan.jpg',
    tags: ['霸道', '商务', '危险'],
    color: '#e17055',
  },
  {
    name: '林小鹿', title: '阳光学弟 · 22岁',
    desc: '复旦大学生，阳光开朗像小太阳。看似单纯实则成熟敏感，对你有真实好感。',
    portrait: '/characters/xiaolu.jpg',
    tags: ['阳光', '校园', '矛盾'],
    color: '#00b894',
  },
  {
    name: '陆沉舟', title: '神秘大叔 · 42岁',
    desc: '神秘富豪，儒雅深沉看透一切。渴望被理解，在"客观性"和"真心"间挣扎。',
    portrait: '/characters/chenzhou.jpg',
    tags: ['神秘', '智慧', '孤独'],
    color: '#74b9ff',
  },
]

// ── Opening Screen ──────────────────────────────────

function OpeningScreen({ onStart }: { onStart: (name: string) => void }) {
  const [phase, setPhase] = useState<'landing' | 'profiles' | 'register'>('landing')
  const [profileIdx, setProfileIdx] = useState(0)
  const [profilesDone, setProfilesDone] = useState(false)
  const [name, setName] = useState('')
  const hasSave = useGameStore((s) => s.hasSave)
  const loadGame = useGameStore((s) => s.loadGame)

  // Continue saved game
  const handleContinue = useCallback(() => {
    initBGM()
    trackGameContinue()
    loadGame()
  }, [loadGame])

  // Auto-advance profiles
  useEffect(() => {
    if (phase !== 'profiles' || profilesDone) return
    if (profileIdx >= NPC_PROFILES.length) {
      setProfilesDone(true)
      return
    }
    const timer = setTimeout(() => setProfileIdx((i) => i + 1), 2500)
    return () => clearTimeout(timer)
  }, [phase, profileIdx, profilesDone])

  // ── Phase 0: APP 启动画面 ──
  if (phase === 'landing') {
    return (
      <div className="jh-landing">
        <div className="jh-landing-glow" />

        {/* 粒子 */}
        <div className="jh-landing-particles">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="jh-landing-particle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${30 + Math.random() * 50}%`,
                width: 2 + Math.random() * 3,
                height: 2 + Math.random() * 3,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <motion.div
          className="jh-landing-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="jh-landing-line" />
          <div className="jh-landing-logo">镜花缘</div>
          <div className="jh-landing-sub">网 恋 杀 猪 盘 实 录</div>
          <div className="jh-landing-slogan">每个人都是一面镜子 · 你看到的只是你想看到的</div>
          <div className="jh-landing-actions">
            <button
              className="jh-landing-start"
              onClick={() => { initBGM(); setPhase('profiles') }}
            >
              开始游戏
            </button>
            {hasSave() && (
              <button className="jh-landing-continue" onClick={handleContinue}>
                继续游戏
              </button>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Phase 1: NPC 档案卡片 ──
  if (phase === 'profiles') {
    const currentProfile = NPC_PROFILES[Math.min(profileIdx, NPC_PROFILES.length - 1)]
    return (
      <div className="jh-profiles">
        {/* 跳过按钮 */}
        <button className="jh-skip-btn" onClick={() => setPhase('register')}>跳过 ›</button>

        {/* APP 导航 */}
        <div className="jh-profiles-nav">
          <div className="jh-profiles-nav-logo">镜花缘</div>
          <div className="jh-profiles-nav-hint">为你推荐</div>
        </div>

        {/* 卡片 */}
        <div className="jh-profiles-stack">
          <AnimatePresence mode="wait">
            {profileIdx < NPC_PROFILES.length && (
              <motion.div
                key={profileIdx}
                className="jh-profile-card"
                initial={{ opacity: 0, scale: 0.95, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -30 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 30 }}
              >
                <img
                  className="jh-profile-card-img"
                  src={currentProfile.portrait}
                  alt={currentProfile.name}
                />
                <div className="jh-profile-card-overlay">
                  <div className="jh-profile-card-name" style={{ color: currentProfile.color }}>
                    {currentProfile.name}
                  </div>
                  <div className="jh-profile-card-title">{currentProfile.title}</div>
                  <div className="jh-profile-card-desc">{currentProfile.desc}</div>
                  <div className="jh-profile-card-tags">
                    {currentProfile.tags.map((tag) => (
                      <span key={tag} className="jh-profile-card-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 进度点 */}
        <div className="jh-profiles-dots">
          {NPC_PROFILES.map((_, i) => (
            <div
              key={i}
              className={`jh-profiles-dot ${i <= profileIdx ? 'jh-profiles-dot-active' : ''}`}
            />
          ))}
        </div>

        {/* CTA */}
        {profilesDone && (
          <motion.div
            className="jh-profiles-cta-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="jh-profiles-cta"
              onClick={() => setPhase('register')}
            >
              创建你的档案
            </button>
          </motion.div>
        )}
      </div>
    )
  }

  // ── Phase 2: 玩家注册 ──
  return (
    <div className="jh-register">
      {/* 粒子 */}
      <div className="jh-register-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="jh-register-spark"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${50 + Math.random() * 40}%`,
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* 注册卡片 */}
      <motion.div
        className="jh-register-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="jh-register-header">
          <div className="jh-register-title">镜花缘</div>
          <div className="jh-register-subtitle">── 个人档案 ──</div>
        </div>

        <div className="jh-register-divider" />

        <div className="jh-register-field">
          <div className="jh-register-label">姓名</div>
          <input
            className="jh-register-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="在这里写下你的名字"
            maxLength={8}
            autoFocus
          />
        </div>

        <div className="jh-register-field">
          <div className="jh-register-label">身份</div>
          <div className="jh-register-value">28岁 · 前互联网公司市场总监</div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="jh-register-field" style={{ flex: 1 }}>
            <div className="jh-register-label">城市</div>
            <div className="jh-register-value">上海</div>
          </div>
          <div className="jh-register-field" style={{ flex: 1 }}>
            <div className="jh-register-label">周期</div>
            <div className="jh-register-value">30天</div>
          </div>
        </div>

        <div className="jh-register-warn">
          <span>⚠️</span>
          <span>镜花缘APP会根据你的情感创伤类型，精准推送匹配对象。你看到的，只是你想看到的。</span>
        </div>

        <button
          className="jh-register-cta"
          disabled={!name.trim()}
          onClick={() => onStart(name.trim())}
        >
          进入镜花缘
        </button>
      </motion.div>
    </div>
  )
}

// ── Ending Modal ────────────────────────────────────

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)

  if (!endingType) return null

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const typeInfo = ENDING_TYPE_MAP[ending.type]

  return (
    <motion.div
      className="jh-ending-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="jh-ending-card"
        style={{ background: typeInfo.gradient }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>{ending.emoji}</div>
        <div className="jh-ending-type">{typeInfo.label}</div>
        <div className="jh-ending-title">{ending.title}</div>
        <p className="jh-ending-desc">{ending.description}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="jh-ending-btn"
            onClick={() => { clearSave(); resetGame() }}
          >
            重新开始
          </button>
          <button
            className="jh-ending-btn-secondary"
            onClick={() => {
              useGameStore.setState({ endingType: null })
            }}
          >
            继续探索
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Menu Overlay ────────────────────────────────────

function MenuOverlay({
  show,
  onClose,
}: {
  show: boolean
  onClose: () => void
}) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)
  const [toast, setToast] = useState('')

  if (!show) return null

  const handleSave = () => {
    saveGame()
    setToast('已保存')
    setTimeout(() => setToast(''), 2000)
  }

  const handleLoad = () => {
    if (loadGame()) {
      onClose()
    }
  }

  const handleReset = () => {
    clearSave()
    resetGame()
    onClose()
  }

  return (
    <motion.div
      className="jh-menu-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="jh-menu-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          {STORY_INFO.title}
        </h3>
        <button className="jh-menu-btn" onClick={handleSave}>保存进度</button>
        <button className="jh-menu-btn" onClick={handleLoad}>读取存档</button>
        <button className="jh-menu-btn jh-menu-danger" onClick={handleReset}>
          重新开始
        </button>
        <button className="jh-menu-btn" onClick={onClose}>继续游戏</button>

        {toast && <div className="jh-toast">{toast}</div>}
      </motion.div>
    </motion.div>
  )
}

// ── App Root ────────────────────────────────────────

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const [showMenu, setShowMenu] = useState(false)

  const sendMessage = useGameStore((s) => s.sendMessage)

  const handleStart = (name: string) => {
    trackGameStart()
    setPlayerInfo(name)
    initGame()
    // 自动发送第一条消息触发 AI 开场
    setTimeout(() => sendMessage('开始游戏'), 500)
  }

  if (!gameStarted) {
    return <OpeningScreen onStart={handleStart} />
  }

  return (
    <>
      <AppShell onMenuOpen={() => setShowMenu(true)} />
      <EndingModal />
      <AnimatePresence>
        {showMenu && (
          <MenuOverlay show={showMenu} onClose={() => setShowMenu(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
