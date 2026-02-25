/**
 * [INPUT]: 依赖 @/lib/store, @/lib/parser, @/lib/bgm, framer-motion
 * [OUTPUT]: 对外提供 MobileGameLayout 组件
 * [POS]: 镜花缘移动端全屏布局，底部Sheet切换，触摸优化
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameStore, SCENES, ITEMS, STORY_INFO, PERIODS,
  PLAYER_STAT_METAS, ENDINGS,
  getAvailableCharacters,
} from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { useBgm } from '@/lib/bgm'
import HighlightModal from './highlight-modal'

// ============================================================
// 结局类型映射 — 数据驱动
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending',  color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#e84393', icon: '🌟' },
  BE: { label: '💀 Bad Ending',    color: '#6b7280', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

const SPRING = { type: 'spring' as const, damping: 25, stiffness: 300 }

// ============================================================
// 移动端顶栏 — 暗色都市情感风
// ============================================================

function MobileHeader({
  onCharClick,
  onMenuClick,
}: {
  onCharClick: () => void
  onMenuClick: () => void
}) {
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const playerStats = useGameStore((s) => s.playerStats)
  const giftValue = useGameStore((s) => s.giftValue)
  const { isPlaying, toggle } = useBgm()

  const period = PERIODS[currentPeriodIndex]
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <header className="mobile-header" style={{ flexDirection: 'column', gap: 4, padding: '8px 12px 6px' }}>
      {/* 上排：天数 + 时段 + 数值 + 音乐 + NPC + 菜单 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="mobile-header-left">
          <span className="mobile-header-stage">💋 第{currentDay}天</span>
          <span className="mobile-header-scene">{period?.icon} {period?.name}</span>
          {PLAYER_STAT_METAS.map((m) => (
            <span key={m.key} style={{ fontSize: 11, color: m.color }}>
              {m.icon}{playerStats[m.key as keyof typeof playerStats]}
            </span>
          ))}
          <span style={{ fontSize: 11, color: '#ffd700' }}>💰{giftValue.toLocaleString()}</span>
          <button
            onClick={(e) => toggle(e)}
            title={isPlaying ? '关闭音乐' : '开启音乐'}
            style={{
              background: 'rgba(232,67,147,0.1)',
              border: '1px solid var(--border)',
              borderRadius: 6, fontSize: 14,
              cursor: 'pointer', padding: '4px 10px',
            }}
          >
            {isPlaying ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="mobile-header-right">
          <button className="mobile-header-npc" onClick={onCharClick}>
            {char
              ? <span style={{ color: char.themeColor }}>{char.name}</span>
              : <span style={{ color: 'var(--text-muted)' }}>选择角色</span>}
            <span className="mobile-header-arrow">▼</span>
          </button>
          <button className="mobile-header-menu" onClick={onMenuClick}>☰</button>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// 移动端信笺
// ============================================================

function MobileLetterCard() {
  return (
    <div className="mobile-letter-card">
      <div className="mobile-letter-icon">💋</div>
      <div className="mobile-letter-genre">INTERACTIVE FICTION</div>
      <h2 className="mobile-letter-title">{STORY_INFO.title}</h2>
      <p className="mobile-letter-body">{STORY_INFO.intro}</p>
    </div>
  )
}

// ============================================================
// 移动端对话区
// ============================================================

function MobileDialogue({ onCharClick }: { onCharClick: () => void }) {
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const currentScene = useGameStore((s) => s.currentScene)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const char = currentCharacter ? characters[currentCharacter] : null
  const hasUserMessage = messages.some((m) => m.role === 'user')
  const scene = SCENES[currentScene]

  useEffect(() => {
    const el = scrollRef.current
    if (el && isNearBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, streamingContent])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={scrollRef} className="mobile-dialogue jh-scrollbar" style={{ position: 'relative' }}>
      {/* 场景背景 + 暗色遮罩（内联于对话区） */}
      {scene?.background && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none',
          backgroundImage: `url(${scene.background})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,26,0.72)' }} />
        </div>
      )}

      {/* 浮动角色小窗 */}
      {char && hasUserMessage && (
        <div
          onClick={onCharClick}
          style={{
            position: 'sticky', top: 8, float: 'right',
            width: 80, height: 106, borderRadius: 10,
            overflow: 'hidden', zIndex: 10, cursor: 'pointer', marginRight: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            border: '2px solid rgba(232,67,147,0.3)',
          }}
        >
          <img
            src={char.fullImage} alt={char.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '14px 4px 4px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            fontSize: 10, fontWeight: 600, color: '#fff', textAlign: 'center',
          }}>
            {char.name}
          </div>
        </div>
      )}

      {messages.length === 0 && <MobileLetterCard />}

      {messages.map((msg) => {
        if (msg.role === 'user') return (
          <div key={msg.id} className="mobile-msg-user">
            <div className="mobile-bubble-user">{msg.content}</div>
          </div>
        )
        if (msg.role === 'system') return (
          <div key={msg.id} className="mobile-msg-system">{msg.content}</div>
        )
        const { narrative, statHtml } = parseStoryParagraph(msg.content)
        return (
          <div key={msg.id}>
            <div className="mobile-msg-ai">
              <div className="mobile-bubble-ai jh-story-paragraph" dangerouslySetInnerHTML={{ __html: narrative }} />
            </div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })}

      {/* 流式输出 */}
      {isTyping && streamingContent && (() => {
        const { narrative, statHtml } = parseStoryParagraph(streamingContent)
        return (
          <div>
            <div className="mobile-msg-ai">
              <div className="mobile-bubble-ai jh-story-paragraph" dangerouslySetInnerHTML={{ __html: narrative }} />
            </div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })()}

      {/* 等待指示器 */}
      {isTyping && !streamingContent && (
        <div className="mobile-msg-ai">
          <div className="mobile-bubble-ai mobile-typing">
            <span className="mobile-typing-dot" />
            <span className="mobile-typing-dot" />
            <span className="mobile-typing-dot" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 移动端输入栏
// ============================================================

function MobileInputBar({ onInventoryClick, onHighlightClick }: {
  onInventoryClick: () => void
  onHighlightClick: () => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const inventory = useGameStore((s) => s.inventory)

  const char = currentCharacter ? characters[currentCharacter] : null
  const canHighlight = messages.filter((m) => m.role !== 'system').length >= 5
  const inventoryCount = Object.values(inventory).reduce((sum, n) => sum + (n > 0 ? n : 0), 0)

  const handleSubmit = async () => {
    if (!input.trim() || isTyping) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  return (
    <div className="mobile-input-bar" style={{ flexDirection: 'column', gap: 0 }}>
      {/* 快捷操作 */}
      {canHighlight && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={onHighlightClick}
            style={{
              flexShrink: 0, padding: '3px 12px', borderRadius: 99,
              border: '1px solid #e84393', color: '#e84393', fontSize: 12,
              background: 'rgba(232,67,147,0.06)', cursor: 'pointer',
            }}
          >
            ✨ 高光
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
        <button className="mobile-inventory-btn" onClick={onInventoryClick}>
          🎒{inventoryCount > 0 && <span className="mobile-inventory-badge">{inventoryCount}</span>}
        </button>
        <input
          ref={inputRef} type="text" className="mobile-input"
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={char ? `对${char.name}说...` : '说点什么...'}
          disabled={isTyping}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
        />
        <button
          className="mobile-send-btn" disabled={isTyping || !input.trim()}
          onClick={handleSubmit}
        >
          发送
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择面板 — 底部抽屉
// ============================================================

function CharacterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentDay = useGameStore((s) => s.currentDay)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const available = getAvailableCharacters(currentDay, characters)

  const handleSelect = (id: string) => {
    selectCharacter(currentCharacter === id ? null : id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={SPRING}>
          <div className="mobile-sheet-handle" />
          <div className="mobile-sheet-title">选择角色</div>
          <div className="mobile-char-grid">
            {Object.values(available).map((char) => {
              const isSelected = currentCharacter === char.id
              const stats = characterStats[char.id]
              return (
                <button
                  key={char.id}
                  className={`mobile-char-card ${isSelected ? 'selected' : ''}`}
                  style={{ borderColor: isSelected ? char.themeColor : 'transparent' }}
                  onClick={() => handleSelect(char.id)}
                >
                  <span style={{ fontSize: 28 }}>{char.avatar}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="mobile-char-name" style={{ color: char.themeColor }}>{char.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{char.title}</span>
                    </div>
                    <div className="mobile-char-stats">
                      {char.statMetas.filter((m) => !m.hidden).map((meta) => {
                        const val = stats?.[meta.key] ?? 0
                        return (
                          <span key={meta.key} style={{ color: meta.color }}>
                            {meta.icon}{val}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 背包面板
// ============================================================

function InventorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)
  const isTyping = useGameStore((s) => s.isTyping)

  const handleUseItem = (itemId: string) => { useItem(itemId); onClose() }
  const hasItems = Object.entries(inventory).some(([, count]) => count > 0)

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div className="mobile-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={SPRING}>
          <div className="mobile-sheet-handle" />
          <div className="mobile-sheet-title">🎒 背包</div>
          <div className="jh-scrollbar" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {hasItems ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
                {Object.entries(inventory).map(([itemId, count]) => {
                  if (count <= 0) return null
                  const item = ITEMS[itemId]
                  if (!item) return null
                  return (
                    <button
                      key={itemId} onClick={() => handleUseItem(itemId)} disabled={isTyping}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'rgba(13,13,26,0.6)',
                        cursor: isTyping ? 'default' : 'pointer',
                        opacity: isTyping ? 0.5 : 1, textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.description}</div>
                      </div>
                      {count > 1 && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>x{count}</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="jh-placeholder" style={{ height: 120 }}>
                <span className="jh-placeholder-icon">🎒</span>
                <span className="jh-placeholder-text">背包空空如也</span>
              </div>
            )}
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 结局面板 — 数据驱动
// ============================================================

function EndingSheet() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)
  const ending = endingType ? ENDINGS.find((e) => e.id === endingType) : null
  if (!ending) return null
  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <motion.div className="jh-ending-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="jh-ending-modal">
        <div style={{ fontSize: 40, marginBottom: 12 }}>{meta.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 6, letterSpacing: 2 }}>{meta.label}</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>{ending.name}</h2>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 20 }}>{ending.description}</p>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '10px 28px', borderRadius: 99, border: 'none',
            background: 'linear-gradient(135deg, #e84393 0%, #d63384 100%)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          返回标题
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// 移动端菜单
// ============================================================

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          className="mobile-menu"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="mobile-menu-title">💋 菜单</div>
          <button className="mobile-menu-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="mobile-menu-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="mobile-menu-btn" style={{ color: '#ef4444' }} onClick={() => { resetGame() }}>🔄 重置游戏</button>
          <button className="mobile-menu-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
          <button className="mobile-menu-btn" onClick={onClose}>▶️ 继续游戏</button>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 移动端游戏主布局
// ============================================================

export default function MobileGameLayout() {
  const [showCharSheet, setShowCharSheet] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const currentScene = useGameStore((s) => s.currentScene)
  const endingType = useGameStore((s) => s.endingType)
  const scene = SCENES[currentScene]

  return (
    <div className="mobile-game" style={{ position: 'relative' }}>
      {/* 全局场景背景 */}
      {scene?.background && (
        <img
          src={scene.background} alt={scene.name}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            zIndex: 0, pointerEvents: 'none',
          }}
        />
      )}
      {/* 暗色遮罩 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(13,13,26,0.72)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      <MobileHeader
        onCharClick={() => setShowCharSheet(true)}
        onMenuClick={() => setShowMenu(true)}
      />
      <MobileDialogue onCharClick={() => setShowCharSheet(true)} />
      <MobileInputBar
        onInventoryClick={() => setShowInventory(true)}
        onHighlightClick={() => setShowHighlight(true)}
      />

      <CharacterSheet open={showCharSheet} onClose={() => setShowCharSheet(false)} />
      <InventorySheet open={showInventory} onClose={() => setShowInventory(false)} />
      <MobileMenu open={showMenu} onClose={() => setShowMenu(false)} />

      <AnimatePresence>
        {showHighlight && <HighlightModal onClose={() => setShowHighlight(false)} />}
      </AnimatePresence>

      {endingType && <EndingSheet />}
    </div>
  )
}
