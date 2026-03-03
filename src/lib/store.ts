/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+双轨解析+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat, chat } from './stream'
import {
  type Character, type CharacterStats, type Message, type StoryRecord,
  PERIODS, MAX_DAYS, MAX_ACTION_POINTS, SCENES, ITEMS,
  PLAYER_STAT_METAS,
  buildCharacters, getCurrentChapter, getDayEvents,
} from './data'
import { extractChoices, parseStoryParagraph } from './parser'
import {
  trackGameStart, trackPlayerCreate,
  trackTimeAdvance, trackChapterEnter,
  trackEndingReached, trackSceneUnlock,
} from './analytics'

// ── Re-export data.ts ────────────────────────────────
export {
  type Character, type CharacterStats, type Message, type StoryRecord,
  type TimePeriod, type StatMeta, type Scene, type GameItem,
  type Chapter, type ForcedEvent, type Ending,
  PERIODS, MAX_DAYS, MAX_ACTION_POINTS,
  SCENES, ITEMS, CHAPTERS, FORCED_EVENTS, ENDINGS,
  PLAYER_STAT_METAS, RELATION_STATS,
  ENDING_TYPE_MAP, STORY_INFO, QUICK_ACTIONS,
  buildCharacters, getStatLevel, getAvailableCharacters, getCurrentChapter,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'jinghua-save-v1'

// ── State / Actions ──────────────────────────────────

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

  activeTab: 'dialogue' | 'scene' | 'character'
  choices: string[]

  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (name: string) => void
  initGame: () => void
  selectCharacter: (id: string) => void
  selectScene: (id: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

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

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    if (char.name.length >= 2) nameToId[char.name.slice(-2)] = id
  }

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

    const globalKey = GLOBAL_ALIASES[statLabel]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
      continue
    }

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

// ── buildSystemPrompt — Script-through ───────────────

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentDay)
  const scene = SCENES[state.currentScene]
  const period = PERIODS[state.currentPeriodIndex] || PERIODS[0]

  const playerDisplay = PLAYER_STAT_METAS
    .map((m) => `${m.icon} ${m.label}: ${state.playerStats[m.key as keyof typeof state.playerStats]}`)
    .join(' | ')

  const npcDisplay = Object.entries(state.characterStats)
    .map(([charId, stats]) => {
      const c = state.characters[charId]
      if (!c) return ''
      const visible = c.statMetas.filter((m) => !m.hidden)
        .map((m) => `${m.label}: ${stats[m.key] ?? 0}`)
        .join(' / ')
      const hidden = c.statMetas.filter((m) => m.hidden)
        .map((m) => `${m.label}: ${stats[m.key] ?? 0}`)
        .join(' / ')
      return `${c.name}: ${visible}${hidden ? ` [隐藏: ${hidden}]` : ''}`
    })
    .filter(Boolean)
    .join('\n')

  return `你是《镜花缘》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「${state.playerName}」
第${state.currentDay}天/${MAX_DAYS}天 · ${period.name}（${period.hours}）
第${chapter.id}章「${chapter.name}」
当前场景：${scene?.name || '未知'} — ${scene?.atmosphere || ''}
${char ? `当前交互角色：${char.name}（${char.title}）` : '当前无交互角色，以旁白身份描述环境和玩家内心独白。'}
行动力：${state.actionPoints}/${MAX_ACTION_POINTS}

## 当前数值
玩家属性：${playerDisplay} | 红包累计: ¥${state.giftValue.toLocaleString()}

NPC数值：
${npcDisplay}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
    const item = ITEMS[k]
    return item ? `${item.icon} ${item.name} x${v}` : ''
  }).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}

## 历史摘要
${state.historySummary || '故事刚刚开始'}

## 数值变化标注（必须严格遵守！）
每次回复末尾（选项之前）必须标注本次互动产生的所有数值变化，缺一不可：
- 角色数值变化：【角色名 好感+N】或【角色名 信任+N】或【角色名 识破+N】（N通常为3-10）
- 玩家属性变化：【真心+N】【业障+N】【自信+N】
示例：
（叙述内容）
【沈清让 好感+5】【顾临渊 信任-3】【真心+2】【业障+5】
1. 选项一
2. 选项二
规则：
- 每次回复至少产生1个数值变化
- 好感/信任/识破变化必须与当前互动的角色相关
- 玩家属性至少标注1个变化（尤其是真心和业障的博弈）`
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
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

    activeTab: 'dialogue',
    choices: [],

    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

    setPlayerInfo: (name) => {
      set((s) => { s.playerName = name })
    },

    initGame: () => {
      const state = get()
      trackGameStart()
      trackPlayerCreate(state.playerName)

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
        s.choices = ['查看角色资料', '探索周围环境', '打开镜花缘APP', '整理心情']

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `欢迎来到《镜花缘》。\n\n你是「${s.playerName}」，28岁，前互联网公司市场总监。三个月前未婚夫在婚礼筹备期劈腿闺蜜，你辞职退婚，搬进法租界老洋房公寓。\n\n带着千疮百孔的心，你下载了高端交友APP"镜花缘"——在这里，每个人都是一面镜子。\n\n你有30天。寻找真爱，成为猎手，或者——救赎自己。`,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          day: 1,
          period: PERIODS[0].name,
          title: '镜花缘开启',
          content: `${s.playerName}下载了镜花缘APP，故事从此刻开始。`,
        })
      })

      // Day 1 events
      const events = getDayEvents(1, [])
      for (const event of events) {
        set((s) => { s.triggeredEvents.push(event.id) })
        get().addSystemMessage(`【${event.name}】${event.description}`)
      }
    },

    selectCharacter: (id) => {
      set((s) => {
        s.currentCharacter = id
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (id) => {
      const scene = SCENES[id]
      if (!scene) return
      const state = get()

      if (scene.unlockCondition?.itemId) {
        if (!state.inventory[scene.unlockCondition.itemId]) return
        if (!state.unlockedScenes.includes(id)) {
          set((s) => { s.unlockedScenes.push(id) })
          trackSceneUnlock(id)
        }
      }

      set((s) => {
        s.currentScene = id
        s.activeTab = 'dialogue'

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${scene.name}。${scene.atmosphere}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId: id,
        })
      })
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (text) => {
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
        // History compression
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

        // Build API messages
        const systemPrompt = buildSystemPrompt(get())
        const recent = get().messages.filter((m) => !m.type).slice(-10)
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

        // Stream
        let fullContent = ''
        await streamChat(
          apiMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        // Parse stat changes
        const afterState = get()
        const { charChanges, globalChanges } = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, char] of Object.entries(afterState.characters)) {
            if (char.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        // Fallback choices
        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const s2 = get()
          const ch = s2.currentCharacter ? s2.characters[s2.currentCharacter] : null
          if (ch) {
            return [
              `继续和${ch.name}聊天`,
              `试探${ch.name}的真实想法`,
              `向${ch.name}表达好感`,
              '换个话题',
            ]
          }
          return ['探索周围环境', '查看手机消息', '整理心情', '自由行动']
        })()

        set((s) => {
          // Apply character stat changes
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }

          // Apply global stat changes
          for (const g of globalChanges) {
            if (g.key === 'giftValue') {
              s.giftValue = Math.max(0, s.giftValue + g.delta)
            } else if (g.key in s.playerStats) {
              const k = g.key as keyof typeof s.playerStats
              s.playerStats[k] = Math.max(0, Math.min(100, s.playerStats[k] + g.delta))
            }
          }

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            character: detectedChar || s.currentCharacter || undefined,
            timestamp: Date.now(),
          })

          s.choices = finalChoices.slice(0, 4)

          // Record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: period.name,
            title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        get().advanceTime()
        get().saveGame()
      } catch {
        set((s) => { s.isTyping = false; s.streamingContent = '' })
        get().addSystemMessage('网络连接异常，请重试。')
      }
    },

    advanceTime: () => {
      set((s) => {
        s.actionPoints -= 1
        s.currentPeriodIndex += 1

        // Cross-day
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay += 1
          s.actionPoints = MAX_ACTION_POINTS

          trackTimeAdvance(s.currentDay, PERIODS[0].name)

          // Stat decay/growth
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

          // Day-change rich message
          const chapter = getCurrentChapter(s.currentDay)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentDay}天 · ${PERIODS[0].name}`,
            timestamp: Date.now(),
            type: 'day-change',
            dayInfo: { day: s.currentDay, period: PERIODS[0].name, chapter: chapter.name },
          })

          // Chapter progression
          if (chapter.id !== s.currentChapter) {
            s.currentChapter = chapter.id
            trackChapterEnter(chapter.id)

            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `— 第${chapter.id}章「${chapter.name}」—`,
              timestamp: Date.now(),
            })
          }

          // Record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: PERIODS[0].name,
            title: `进入第${s.currentDay}天`,
            content: `${chapter.name} · ${PERIODS[0].name}`,
          })
        } else {
          const period = PERIODS[s.currentPeriodIndex]
          trackTimeAdvance(s.currentDay, period.name)
        }

        // Forced events
        const events = getDayEvents(s.currentDay, [...s.triggeredEvents])
        for (const event of events) {
          s.triggeredEvents.push(event.id)
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `【${event.name}】${event.description}`,
            timestamp: Date.now(),
          })
          s.storyRecords.push({
            id: `sr-${Date.now()}-evt`,
            day: s.currentDay,
            period: (PERIODS[s.currentPeriodIndex] || PERIODS[0]).name,
            title: event.name,
            content: event.description,
          })
        }
      })

      // Check ending
      if (get().currentDay > MAX_DAYS) {
        get().checkEnding()
      }
    },

    useItem: (itemId) => {
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

      get().addSystemMessage(`使用了「${item.name}」`)
    },

    checkEnding: () => {
      const s = get()
      if (s.endingType) return
      const ps = s.playerStats
      const cz = s.characterStats.chenzhou

      let ending: string | null = null

      // BE: 社死 — 业障过高反噬
      if (ps.karma >= 90) {
        ending = 'be-social-death'
      }
      // BE: 行尸走肉 — 真心枯竭
      else if (ps.sincerity <= 10 && ps.karma >= 60) {
        ending = 'be-heartdead'
      }
      // TE: 镜花水月 — 揭穿一切
      else if (cz && (cz.affection ?? 0) >= 95 && (cz.insight ?? 0) >= 80) {
        ending = 'te-mirror'
      }
      // HE: 破镜重圆 — 找到真爱
      else if (
        Object.values(s.characterStats).some((st) => (st.affection ?? 0) >= 80) &&
        ps.sincerity >= 60 && ps.karma <= 40
      ) {
        ending = 'he-truelove'
      }
      // HE: 独美 — 自我救赎
      else if (
        ps.sincerity >= 80 && ps.confidence >= 80 &&
        Object.values(s.characterStats).every((st) => (st.affection ?? 0) >= 30 && (st.affection ?? 0) <= 65)
      ) {
        ending = 'he-self'
      }
      // NE: 猎手 — 兜底
      else {
        ending = 'ne-hunter'
      }

      if (ending) {
        trackEndingReached(ending)
        set((d) => { d.endingType = ending })
      }
    },

    addSystemMessage: (content) => {
      set((s) => {
        s.messages.push({
          id: makeId(),
          role: 'system',
          content,
          timestamp: Date.now(),
        })
      })
    },

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
        s.activeTab = 'dialogue'
        s.choices = []
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
    },

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
        storyRecords: s.storyRecords.slice(-50),
        endingType: s.endingType,
        choices: s.choices,
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      } catch { /* storage full */ }
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
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
          s.storyRecords = data.storyRecords ?? []
          s.endingType = data.endingType ?? null
          s.choices = data.choices ?? []
        })
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try { return !!localStorage.getItem(SAVE_KEY) }
      catch { return false }
    },

    clearSave: () => {
      try { localStorage.removeItem(SAVE_KEY) }
      catch { /* ignore */ }
    },
  })),
)
