/**
 * [INPUT]: 依赖 zustand, immer, stream.ts, data.ts
 * [OUTPUT]: useGameStore 状态库 + data.ts 全部常量/类型的统一转导
 * [POS]: 状态管理核心，被所有 UI 组件消费，承载全部游戏逻辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from './stream'
import {
  type Character, type CharacterStats, type Message,
  PERIODS, MAX_DAYS, MAX_ACTION_POINTS, SCENES, ITEMS,
  PLAYER_STAT_METAS,
  buildCharacters, getCurrentChapter, getDayEvents,
} from './data'

// ── 常量 ──────────────────────────────────────────────

type GameStore = GameState & GameActions

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'jinghua-save-v1'

// ── 状态接口 ──────────────────────────────────────────

interface GameState {
  gameStarted: boolean
  playerName: string
  characters: Record<string, Character>

  currentDay: number
  currentPeriodIndex: number
  actionPoints: number

  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  currentChapter: number
  triggeredEvents: string[]
  inventory: Record<string, number>

  playerStats: { sincerity: number; karma: number; confidence: number }
  giftValue: number

  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string

  endingType: string | null
  activePanel: 'inventory' | 'relations' | null
}

// ── 行为接口 ──────────────────────────────────────────

interface GameActions {
  setPlayerInfo: (name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  togglePanel: (panel: 'inventory' | 'relations') => void
  closePanel: () => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => void
  hasSave: () => boolean
  clearSave: () => void
}

// ── 数值解析（双轨：角色数值 + 全局数值） ────────────

interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ key: string; delta: number }>
}

const GLOBAL_ALIASES: Record<string, string> = {
  '真心': 'sincerity', '真心值': 'sincerity',
  '业障': 'karma', '业障值': 'karma',
  '自信': 'confidence', '自信值': 'confidence',
  '红包': 'giftValue', '礼物价值': 'giftValue',
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>,
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  // 名称→ID 映射（含简写）
  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    if (char.name.length >= 2) nameToId[char.name.slice(-2)] = id
  }

  // 标签→key 映射（从 statMetas 动态生成）
  const labelToKey: Record<string, Array<{ charId: string; key: string }>> = {}
  for (const [charId, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      for (const suffix of [meta.label, meta.label + '度', meta.label + '值']) {
        if (!labelToKey[suffix]) labelToKey[suffix] = []
        labelToKey[suffix].push({ charId, key: meta.key })
      }
    }
  }

  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content))) {
    const [, context, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)

    // 全局数值优先
    const globalKey = GLOBAL_ALIASES[statLabel]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
      continue
    }

    // 角色数值
    const charId = nameToId[context]
    if (charId) {
      const entries = labelToKey[statLabel]
      const entry = entries?.find((e) => e.charId === charId) ?? entries?.[0]
      if (entry) {
        charChanges.push({ charId: entry.charId, stat: entry.key, delta })
      }
    }
  }

  return { charChanges, globalChanges }
}

// ── 系统提示词 ───────────────────────────────────────

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentDay)
  const scene = SCENES[state.currentScene]

  const playerDisplay = PLAYER_STAT_METAS
    .map((m) => `${m.icon} ${m.label}: ${state.playerStats[m.key as keyof typeof state.playerStats]}`)
    .join(' | ')

  return `## 世界观
2025年上海。高端交友APP「镜花缘」悄然上线，主打"AI精准匹配+真人社交"。
每位用户都经过严格背景审核——至少表面如此。
在这里，每个人都戴着面具，真心和谎言的边界模糊不清。
APP背后隐藏着更深的秘密：它不只是交友平台，更是一场关于信任的实验。

## 玩家身份
玩家「${state.playerName}」，女，28岁，前互联网公司市场总监。
三个月前，相恋五年的未婚夫在婚礼筹备期劈腿闺蜜。她辞职退婚，搬进法租界老洋房公寓，带着千疮百孔的心下载了「镜花缘」。
当前状态：${playerDisplay} | 💰 红包累计: ¥${state.giftValue.toLocaleString()}

## 叙述风格
- 每段回复200-400字，文学性细腻描写，注重心理刻画和氛围营造
- 角色对话：【角色名】"对话内容"（描写肢体语言和微表情）
- 环境描写用（括号）标注氛围和感官细节
- 数值变化必须在回复末尾严格输出：
  角色数值：【角色全名】好感+N 【角色全名】信任+N 【角色全名】识破+N
  隐藏数值：【角色全名】依赖+N 【角色全名】自卑+N 等
  玩家数值：【玩家】真心+N 【玩家】业障+N 【玩家】自信+N
  礼物价值：【玩家】红包+N（N为金额）
- 每次回复至少输出2-3条数值变化

## 当前章节
第${chapter.id}章「${chapter.name}」：${chapter.description}
目标：${chapter.objectives.join('、')}
氛围：${chapter.atmosphere}

## 当前场景
${scene.name}：${scene.atmosphere}
标签：${scene.tags.join('、')}

${char ? `## 当前交互角色
${char.name}（${char.title}），男，${char.age}岁
外貌：${char.description}
性格：${char.personality}
说话风格：${char.speakingStyle}
行为模式：${char.behaviorPatterns}
隐藏秘密：${char.secret}
触发机制：${char.triggerPoints.join('；')}

当前数值：
${char.statMetas.map((m) => {
  const val = state.characterStats[char.id]?.[m.key] ?? 0
  return `${m.icon} ${m.label}: ${val}/100${m.hidden ? '（隐藏·AI内部追踪）' : ''}`
}).join('\n')}` : '当前无交互角色。以旁白身份描述环境和玩家内心独白。'}

## 时间
第${state.currentDay}天/${MAX_DAYS}天 · ${PERIODS[state.currentPeriodIndex].name}（${PERIODS[state.currentPeriodIndex].hours}）

## 行为准则
- 保持角色人设，说话风格、口癖和行为模式严格遵循设定
- 好感低→冷淡敷衍；好感高→热情主动；识破高→心虚闪躲找借口
- 深夜时段（20:00-04:59）情绪波动×1.5，更容易吐露真心或犯错
- 不要替玩家做选择，只描述角色反应和环境变化
- 隐藏数值（依赖/自卑/占有/罪恶/愧疚/矛盾/兴趣/孤独）必须输出变化但玩家看不到`
}

// ── 状态库 ───────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── 初始状态 ──
    gameStarted: false,
    playerName: '',
    characters: {},

    currentDay: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,

    currentScene: 'home',
    currentCharacter: null,
    characterStats: {},
    unlockedScenes: ['home'],

    currentChapter: 1,
    triggeredEvents: [],
    inventory: {},

    playerStats: { sincerity: 50, karma: 0, confidence: 30 },
    giftValue: 0,

    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',

    endingType: null,
    activePanel: null,

    // ── 玩家信息（固定女性，只需姓名） ──
    setPlayerInfo: (name: string) => {
      set((s) => { s.playerName = name })
    },

    // ── 初始化游戏 ──
    initGame: () => {
      const characters = buildCharacters()
      const characterStats: Record<string, CharacterStats> = {}
      for (const [id, char] of Object.entries(characters)) {
        characterStats[id] = { ...char.initialStats }
      }

      set((s) => {
        s.gameStarted = true
        s.characters = characters
        s.characterStats = characterStats
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'home'
        s.currentChapter = 1
        s.unlockedScenes = ['home']
        s.playerStats = { sincerity: 50, karma: 0, confidence: 30 }
        s.giftValue = 0
        s.messages = []
        s.historySummary = ''
        s.triggeredEvents = []
        s.inventory = {}
        s.endingType = null
      })

      // 第1天事件
      const events = getDayEvents(1, [])
      for (const event of events) {
        set((s) => { s.triggeredEvents.push(event.id) })
        get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
      }
    },

    // ── 角色选择 ──
    selectCharacter: (id: string | null) => {
      set((s) => { s.currentCharacter = id })
    },

    // ── 场景选择（需道具解锁） ──
    selectScene: (id: string) => {
      const scene = SCENES[id]
      if (!scene) return
      const state = get()

      if (scene.unlockCondition?.itemId) {
        if (!state.inventory[scene.unlockCondition.itemId]) return
        if (!state.unlockedScenes.includes(id)) {
          set((s) => { s.unlockedScenes.push(id) })
        }
      }

      set((s) => { s.currentScene = id })
    },

    // ── 面板切换 ──
    togglePanel: (panel) => {
      set((s) => { s.activePanel = s.activePanel === panel ? null : panel })
    },

    closePanel: () => {
      set((s) => { s.activePanel = null })
    },

    // ── 发送消息（流式 + 数值解析） ──
    sendMessage: async (text: string) => {
      if (get().endingType || get().isTyping) return

      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'user',
          content: text,
          character: s.currentCharacter ?? undefined,
          timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        // 历史压缩
        const state = get()
        if (state.messages.length > 15 && !state.historySummary) {
          const summary = await chat([
            {
              role: 'system',
              content: '将以下对话压缩为200字以内的中文摘要，保留关键剧情、数值变化和人物关系转折：',
            },
            ...state.messages.slice(0, -5).map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
          ])
          set((s) => { s.historySummary = summary })
        }

        // 构建 API 消息
        const systemPrompt = buildSystemPrompt(get())
        const recent = get().messages.slice(-10)
        const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...(get().historySummary
            ? [{ role: 'system' as const, content: `前情摘要：${get().historySummary}` }]
            : []),
          ...recent.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ]

        // 流式请求
        let fullContent = ''
        await streamChat(
          apiMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        // 解析并应用数值变化
        const { charChanges, globalChanges } = parseStatChanges(fullContent, get().characters)
        set((s) => {
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }
          for (const g of globalChanges) {
            if (g.key === 'giftValue') {
              s.giftValue = Math.max(0, s.giftValue + g.delta)
            } else if (g.key in s.playerStats) {
              const k = g.key as keyof typeof s.playerStats
              s.playerStats[k] = Math.max(0, Math.min(100, s.playerStats[k] + g.delta))
            }
          }

          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: fullContent,
            character: s.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        get().advanceTime()
        get().saveGame()
      } catch {
        set((s) => { s.isTyping = false; s.streamingContent = '' })
        get().addSystemMessage('⚠️ 网络连接异常，请重试。')
      }
    },

    // ── 时间推进 ──
    advanceTime: () => {
      set((s) => {
        s.actionPoints -= 1
        s.currentPeriodIndex += 1

        // 跨天
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay += 1
          s.actionPoints = MAX_ACTION_POINTS

          // stat 自动衰减/增长
          for (const [charId, char] of Object.entries(s.characters)) {
            const stats = s.characterStats[charId]
            if (!stats) continue
            for (const meta of char.statMetas) {
              if (meta.autoIncrement) {
                stats[meta.key] = Math.min(100, (stats[meta.key] ?? 0) + meta.autoIncrement)
              }
              if (meta.decayRate) {
                stats[meta.key] = Math.max(0, (stats[meta.key] ?? 0) - meta.decayRate)
              }
            }
          }

          // 章节推进
          const newChapter = getCurrentChapter(s.currentDay)
          if (newChapter.id !== s.currentChapter) {
            s.currentChapter = newChapter.id
          }
        }
      })

      // 时间提示
      const state = get()
      get().addSystemMessage(
        `⏰ 第${state.currentDay}天 · ${PERIODS[state.currentPeriodIndex].name}`,
      )

      // 强制事件
      const events = getDayEvents(state.currentDay, state.triggeredEvents)
      for (const event of events) {
        set((s) => { s.triggeredEvents.push(event.id) })
        get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
      }

      // 最终结局
      if (state.currentDay > MAX_DAYS) {
        get().checkEnding()
      }
    },

    // ── 使用道具 ──
    useItem: (itemId: string) => {
      const item = ITEMS[itemId]
      if (!item) return
      const state = get()
      if (!state.inventory[itemId] || state.inventory[itemId] <= 0) return

      set((s) => {
        if (item.type === 'consumable') {
          s.inventory[itemId] -= 1
          if (s.inventory[itemId] <= 0) delete s.inventory[itemId]
        }

        switch (itemId) {
          case 'gift': {
            if (s.currentCharacter) {
              const stats = s.characterStats[s.currentCharacter]
              if (stats) {
                const bonus = 10 + Math.floor(Math.random() * 21)
                stats.affection = Math.min(100, (stats.affection ?? 0) + bonus)
              }
            }
            break
          }
          case 'evidence_photo': {
            if (s.currentCharacter) {
              const stats = s.characterStats[s.currentCharacter]
              if (stats) {
                stats.insight = Math.min(100, (stats.insight ?? 0) + 50)
                stats.affection = Math.max(0, (stats.affection ?? 0) - 30)
              }
            }
            break
          }
          case 'investment_proposal': {
            s.playerStats.karma = Math.min(100, s.playerStats.karma + 20)
            break
          }
        }
      })

      get().addSystemMessage(`📦 使用了「${item.name}」`)
    },

    // ── 结局检查（BE→TE→HE→NE 优先级） ──
    checkEnding: () => {
      const s = get()
      const ps = s.playerStats
      const cz = s.characterStats.chenzhou

      // BE: 社死 — 业障过高反噬
      if (ps.karma >= 90) {
        set((d) => { d.endingType = 'be-social-death' })
        return
      }

      // BE: 行尸走肉 — 真心枯竭
      if (ps.sincerity <= 10 && ps.karma >= 60) {
        set((d) => { d.endingType = 'be-heartdead' })
        return
      }

      // TE: 镜花水月 — 揭穿一切，与陆沉舟共鸣
      if (cz && cz.affection >= 95 && cz.insight >= 80) {
        set((d) => { d.endingType = 'te-mirror' })
        return
      }

      // HE: 破镜重圆 — 找到真爱
      const hasDeepLove = Object.values(s.characterStats).some(
        (stats) => (stats.affection ?? 0) >= 80,
      )
      if (hasDeepLove && ps.sincerity >= 60 && ps.karma <= 40) {
        set((d) => { d.endingType = 'he-truelove' })
        return
      }

      // HE: 独美 — 自我救赎
      const allBalanced = Object.values(s.characterStats).every(
        (stats) => (stats.affection ?? 0) >= 30 && (stats.affection ?? 0) <= 65,
      )
      if (ps.sincerity >= 80 && ps.confidence >= 80 && allBalanced) {
        set((d) => { d.endingType = 'he-self' })
        return
      }

      // NE: 猎手 — 兜底
      set((d) => { d.endingType = 'ne-hunter' })
    },

    // ── 系统消息 ──
    addSystemMessage: (content: string) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

    // ── 重置 ──
    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.playerName = ''
        s.characters = {}
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'home'
        s.currentCharacter = null
        s.characterStats = {}
        s.unlockedScenes = ['home']
        s.currentChapter = 1
        s.triggeredEvents = []
        s.inventory = {}
        s.playerStats = { sincerity: 50, karma: 0, confidence: 30 }
        s.giftValue = 0
        s.messages = []
        s.historySummary = ''
        s.isTyping = false
        s.streamingContent = ''
        s.endingType = null
        s.activePanel = null
      })
    },

    // ── 存档 ──
    saveGame: () => {
      const s = get()
      const data = {
        version: 1,
        playerName: s.playerName,
        characters: s.characters,
        currentDay: s.currentDay,
        currentPeriodIndex: s.currentPeriodIndex,
        actionPoints: s.actionPoints,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        characterStats: s.characterStats,
        unlockedScenes: s.unlockedScenes,
        currentChapter: s.currentChapter,
        triggeredEvents: s.triggeredEvents,
        inventory: s.inventory,
        playerStats: s.playerStats,
        giftValue: s.giftValue,
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        endingType: s.endingType,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    },

    loadGame: () => {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        set((s) => {
          s.gameStarted = true
          s.playerName = data.playerName ?? ''
          s.characters = data.characters ?? buildCharacters()
          s.currentDay = data.currentDay ?? 1
          s.currentPeriodIndex = data.currentPeriodIndex ?? 0
          s.actionPoints = data.actionPoints ?? MAX_ACTION_POINTS
          s.currentScene = data.currentScene ?? 'home'
          s.currentCharacter = data.currentCharacter ?? null
          s.characterStats = data.characterStats ?? {}
          s.unlockedScenes = data.unlockedScenes ?? ['home']
          s.currentChapter = data.currentChapter ?? 1
          s.triggeredEvents = data.triggeredEvents ?? []
          s.inventory = data.inventory ?? {}
          s.playerStats = data.playerStats ?? { sincerity: 50, karma: 0, confidence: 30 }
          s.giftValue = data.giftValue ?? 0
          s.messages = data.messages ?? []
          s.historySummary = data.historySummary ?? ''
          s.endingType = data.endingType ?? null
        })
      } catch { /* corrupt save, ignore */ }
    },

    hasSave: () => !!localStorage.getItem(SAVE_KEY),

    clearSave: () => localStorage.removeItem(SAVE_KEY),
  })),
)

// ── 统一导出 data.ts ─────────────────────────────────

export {
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_DAYS, MAX_ACTION_POINTS,
  STORY_INFO, FORCED_EVENTS, ENDINGS,
  PLAYER_STAT_METAS, RELATION_STATS,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter,
} from './data'

export type {
  Character, CharacterStats, Scene, GameItem, Chapter,
  ForcedEvent, Ending, TimePeriod, Message, StatMeta,
} from './data'
