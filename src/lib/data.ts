/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 全部类型定义 + 常量 + 4角色/5场景/8道具/4章节/事件/6结局 + 工具函数
 * [POS]: UI 薄层，叙事内容在 script.md
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 时间系统 ──────────────────────────────────────────

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export const PERIODS: TimePeriod[] = [
  { index: 0, name: '清晨', icon: '🌅', hours: '05:00-08:59' },
  { index: 1, name: '上午', icon: '☀️', hours: '09:00-11:59' },
  { index: 2, name: '中午', icon: '🌞', hours: '12:00-13:59' },
  { index: 3, name: '下午', icon: '⛅', hours: '14:00-16:59' },
  { index: 4, name: '傍晚', icon: '🌇', hours: '17:00-19:59' },
  { index: 5, name: '深夜', icon: '🌙', hours: '20:00-04:59' },
]

export const MAX_DAYS = 30
export const MAX_ACTION_POINTS = 6

// ── 属性元数据 ────────────────────────────────────────

export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  category: 'relation' | 'status' | 'skill'
  hidden?: boolean
  autoIncrement?: number
  decayRate?: number
}

export type CharacterStats = Record<string, number>

export const RELATION_STATS: StatMeta[] = [
  { key: 'affection', label: '好感', color: '#ef4444', icon: '❤️', category: 'relation' },
  { key: 'trust', label: '信任', color: '#22c55e', icon: '🤝', category: 'relation' },
  { key: 'insight', label: '识破', color: '#f59e0b', icon: '🔍', category: 'relation' },
]

export const PLAYER_STAT_METAS: StatMeta[] = [
  { key: 'sincerity', label: '真心', color: '#e84393', icon: '💗', category: 'status' },
  { key: 'karma', label: '业障', color: '#6c5ce7', icon: '⚖️', category: 'status' },
  { key: 'confidence', label: '自信', color: '#00b894', icon: '✨', category: 'status' },
]

// ── 角色 ──────────────────────────────────────────────

export interface Character {
  id: string
  name: string
  age: number
  title: string
  portrait: string
  themeColor: string
  shortDesc: string
  personality: string
  tags: string[]
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

const CHARACTER_LIST: Character[] = [
  {
    id: 'qingrang',
    name: '沈清让',
    age: 32,
    title: '温柔艺术家',
    portrait: '/characters/qingrang.jpg',
    themeColor: '#a29bfe',
    shortDesc: '画廊策展人，温润如玉的文艺青年，保持距离感的温柔',
    personality: '温柔细腻却保持距离感，极度害怕被抛弃。用艺术逃避现实，对真心既渴望又恐惧。',
    tags: ['文艺', '温柔', '距离感'],
    statMetas: [
      ...RELATION_STATS,
      { key: 'dependency', label: '依赖', color: '#a29bfe', icon: '🫂', category: 'status', hidden: true },
      { key: 'inferiority', label: '自卑', color: '#636e72', icon: '😔', category: 'status', hidden: true },
    ],
    initialStats: { affection: 20, trust: 10, insight: 0, dependency: 0, inferiority: 70 },
  },
  {
    id: 'linyuan',
    name: '顾临渊',
    age: 35,
    title: '霸道总裁',
    portrait: '/characters/linyuan.jpg',
    themeColor: '#e17055',
    shortDesc: '创业公司CEO，霸道自信的掌控者，内心是受伤的孩子',
    personality: '霸道自信掌控欲强，用强势保护自己。既渴望真爱又不敢相信，用"征服"填补空洞。',
    tags: ['霸道', '商务', '危险'],
    statMetas: [
      ...RELATION_STATS,
      { key: 'possessiveness', label: '占有', color: '#d63031', icon: '🔥', category: 'status', hidden: true },
      { key: 'guilt', label: '罪恶', color: '#636e72', icon: '⛓️', category: 'status', hidden: true },
    ],
    initialStats: { affection: 10, trust: 5, insight: 0, possessiveness: 0, guilt: 30 },
  },
  {
    id: 'xiaolu',
    name: '林小鹿',
    age: 22,
    title: '阳光学弟',
    portrait: '/characters/xiaolu.jpg',
    themeColor: '#00b894',
    shortDesc: '复旦大学生，阳光开朗像小太阳，看似单纯实则矛盾',
    personality: '阳光开朗话多像小太阳，看似单纯实则成熟敏感。对玩家有真实好感但无法坦白。',
    tags: ['阳光', '校园', '矛盾'],
    statMetas: [
      ...RELATION_STATS,
      { key: 'remorse', label: '愧疚', color: '#fdcb6e', icon: '😣', category: 'status', hidden: true },
      { key: 'conflict', label: '矛盾', color: '#e17055', icon: '💫', category: 'status', hidden: true },
    ],
    initialStats: { affection: 30, trust: 20, insight: 0, remorse: 0, conflict: 50 },
  },
  {
    id: 'chenzhou',
    name: '陆沉舟',
    age: 42,
    title: '神秘大叔',
    portrait: '/characters/chenzhou.jpg',
    themeColor: '#74b9ff',
    shortDesc: '神秘富豪，儒雅深沉看透一切，内心极度孤独',
    personality: '神秘智慧看透一切，内心极度孤独。渴望被理解，在"客观性"和"真心"间挣扎。',
    tags: ['神秘', '智慧', '孤独'],
    statMetas: [
      ...RELATION_STATS,
      { key: 'interest', label: '兴趣', color: '#74b9ff', icon: '🧐', category: 'status', hidden: true },
      { key: 'loneliness', label: '孤独', color: '#636e72', icon: '🌑', category: 'status', hidden: true },
    ],
    initialStats: { affection: 10, trust: 5, insight: 0, interest: 50, loneliness: 70 },
  },
]

export function buildCharacters(): Record<string, Character> {
  const map: Record<string, Character> = {}
  for (const c of CHARACTER_LIST) map[c.id] = { ...c }
  return map
}

export function getAvailableCharacters(
  _day: number,
  characters: Record<string, Character>,
): Record<string, Character> {
  return { ...characters }
}

// ── 场景 ──────────────────────────────────────────────

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
  unlockCondition?: {
    itemId?: string
    charId?: string
    stat?: { charId: string; key: string; min: number }
  }
}

export const SCENES: Record<string, Scene> = {
  home: {
    id: 'home',
    name: '老洋房公寓',
    icon: '🏠',
    description: '老法租界45平loft，ins风装修三个月没打扫，外卖盒堆在角落',
    background: '/scenes/home.jpg',
    atmosphere: '外表光鲜内里空虚，窗外梧桐树斑驳光影，深夜只有手机屏幕的光亮',
    tags: ['私密', '日常', '脆弱'],
  },
  gallery: {
    id: 'gallery',
    name: '沈清让画廊',
    icon: '🖼️',
    description: 'M50创意园工业风画廊，高挑天花白墙灰地，角落有老式留声机',
    background: '/scenes/gallery.jpg',
    atmosphere: '安静文艺略带忧郁，油画颜料味混着咖啡香，空旷得像沈清让的内心',
    tags: ['文艺', '约会', '探索'],
    unlockCondition: { itemId: 'gallery_invite', charId: 'qingrang' },
  },
  company: {
    id: 'company',
    name: '顾临渊公司',
    icon: '🏢',
    description: '陆家嘴现代办公楼，巨大落地窗可看外滩，黑白金属色调',
    background: '/scenes/company.jpg',
    atmosphere: '高效冷酷充满压力，空调温度极低，键盘声和顾临渊的皮鞋声',
    tags: ['商务', '危险', '探索'],
    unlockCondition: { itemId: 'company_invite', charId: 'linyuan' },
  },
  campus: {
    id: 'campus',
    name: '复旦校园',
    icon: '🎓',
    description: '绿树成荫的校园，红砖建筑大片草坪，公告栏贴满海报',
    background: '/scenes/campus.jpg',
    atmosphere: '青春活力充满希望，青草味和书本味，单纯美好却即将被现实打破',
    tags: ['青春', '约会', '探索'],
    unlockCondition: { itemId: 'campus_map', charId: 'xiaolu' },
  },
  tearoom: {
    id: 'tearoom',
    name: '陆沉舟茶室',
    icon: '🍵',
    description: '法租界老洋房一楼，中式木质家具山水画，角落一盆兰花',
    background: '/scenes/tearoom.jpg',
    atmosphere: '宁静温馨略带神秘，茶香木质味兰花香，深沉温暖却隐藏秘密',
    tags: ['禅意', '约会', '探索'],
    unlockCondition: { itemId: 'tearoom_invite', charId: 'chenzhou' },
  },
}

// ── 道具 ──────────────────────────────────────────────

export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest' | 'scene-key'
  description: string
  maxCount?: number
}

export const ITEMS: Record<string, GameItem> = {
  memory_fragment: {
    id: 'memory_fragment',
    name: '记忆碎片',
    icon: '💎',
    type: 'consumable',
    description: '透明晶体内有淡淡光芒，用于回溯到之前的存档节点',
  },
  evidence_photo: {
    id: 'evidence_photo',
    name: '证据照片',
    icon: '📸',
    type: 'quest',
    description: '记录NPC破绽的照片，可用于揭穿谎言（识破度+50，好感度-30）',
  },
  gift: {
    id: 'gift',
    name: '礼物',
    icon: '🎁',
    type: 'consumable',
    description: '精美礼盒，赠送可提升好感度（+10~30，视NPC喜好）',
  },
  gallery_invite: {
    id: 'gallery_invite',
    name: '画廊邀请函',
    icon: '🎫',
    type: 'scene-key',
    description: '沈清让的亲笔签名邀请函，解锁画廊场景',
  },
  company_invite: {
    id: 'company_invite',
    name: '公司邀请函',
    icon: '💳',
    type: 'scene-key',
    description: '顾临渊的公司参观邀请，解锁公司场景',
  },
  campus_map: {
    id: 'campus_map',
    name: '校园地图',
    icon: '🗺️',
    type: 'scene-key',
    description: '林小鹿手绘的校园地图，标注了秘密基地位置，解锁校园场景',
  },
  tearoom_invite: {
    id: 'tearoom_invite',
    name: '茶室邀请函',
    icon: '🏮',
    type: 'scene-key',
    description: '陆沉舟的亲笔签名和一句诗，解锁茶室场景',
  },
  investment_proposal: {
    id: 'investment_proposal',
    name: '投资建议书',
    icon: '📊',
    type: 'quest',
    description: '顾临渊的"投资机会"文件，签名在末尾——杀猪盘的核心道具',
  },
}

// ── 章节 ──────────────────────────────────────────────

export interface Chapter {
  id: number
  name: string
  dayRange: [number, number]
  objectives: string[]
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '镜花水月',
    dayRange: [1, 7],
    objectives: ['与至少3位男性建立联系', '识破至少1位男性的伪装', '发现APP的"算法秘密"'],
  },
  {
    id: 2,
    name: '雾里看花',
    dayRange: [8, 14],
    objectives: ['与至少1位男性好感度达50', '收集至少1份证据', '触发深夜对话事件'],
  },
  {
    id: 3,
    name: '水落石出',
    dayRange: [15, 21],
    objectives: ['触发至少1位男性的真相事件', '面对前未婚夫的消息', '发现镜花缘APP的真正目的'],
  },
  {
    id: 4,
    name: '镜破重圆',
    dayRange: [22, 30],
    objectives: ['达成游戏目标', '解决与前未婚夫的恩怨', '做出最终选择'],
  },
]

// ── 强制事件 ──────────────────────────────────────────

export interface ForcedEvent {
  id: string
  name: string
  triggerDay: number
  description: string
}

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'first_encounter',
    name: '初遇',
    triggerDay: 1,
    description: '欢迎来到镜花缘。系统根据你的"情感创伤类型"，精准推送了4位男性——每个人都是一面镜子，你看到的，只是你想看到的。',
  },
  {
    id: 'mysterious_message',
    name: '神秘消息',
    triggerDay: 7,
    description: '收到一条匿名消息："你以为你在钓鱼，其实你是鱼。"——是谁在暗中观察你？',
  },
  {
    id: 'ex_message',
    name: '前未婚夫来信',
    triggerDay: 14,
    description: '手机亮起一条久违的消息。前未婚夫说："我后悔了。"——旧伤口被撕开，你会如何回应？',
  },
  {
    id: 'midterm_report',
    name: '中期考核',
    triggerDay: 15,
    description: '系统发送"中期报告"，分析你的社交模式和情感投入。如果进度不理想，系统推送"补救措施"——但这可能是陷阱。',
  },
  {
    id: 'final_choice',
    name: '最终抉择',
    triggerDay: 30,
    description: '第30天。镜花缘APP弹出最终选择框——选择一个人，或选择自己，或继续游戏人间。这一次，没有重来的机会。',
  },
]

// ── 结局 ──────────────────────────────────────────────

export interface Ending {
  id: string
  title: string
  type: 'TE' | 'HE' | 'NE' | 'BE'
  emoji: string
  description: string
  condition: string
}

export const ENDINGS: Ending[] = [
  {
    id: 'be-social-death',
    title: '社死',
    type: 'BE',
    emoji: '💀',
    description: '你的欺骗行为被曝光，个人信息被泄露，遭受网络暴力。失去了工作、朋友和尊严。网络不是法外之地。',
    condition: '业障值≥90 + 触发反噬事件 + 选择反击或逃避',
  },
  {
    id: 'be-heartdead',
    title: '行尸走肉',
    type: 'BE',
    emoji: '💔',
    description: '你失去了感受爱的能力，即使遇到真心对你好的人，也无法相信。你保护了自己，但也杀死了自己。',
    condition: '真心值≤10 + 业障值≥60',
  },
  {
    id: 'te-mirror',
    title: '镜花水月',
    type: 'TE',
    emoji: '🪞',
    description: '发现一切都是实验，但实验的意义是证明——即使在最虚假的环境中，真爱依然存在。你不仅完成了游戏，还完成了一个关于人性的实验。',
    condition: '与陆沉舟好感度100 + 触发开发者模式',
  },
  {
    id: 'he-truelove',
    title: '破镜重圆',
    type: 'HE',
    emoji: '💕',
    description: '你和他坦诚相见，彼此接纳对方的不完美。虽然过程曲折，但最终找到了真爱。即使被伤害过，仍然可以重新相信爱情。',
    condition: '某位NPC好感度≥80 + 真心值≥60 + 业障值≤40 + 触发真相事件并选择原谅',
  },
  {
    id: 'he-self',
    title: '独美',
    type: 'HE',
    emoji: '🦋',
    description: '你不需要通过他人的认可来证明自己的价值。你选择独自美丽，专注于自己的事业和成长。爱情不是人生的全部。',
    condition: '真心值≥80 + 自信值≥80 + 所有NPC好感度40-60',
  },
  {
    id: 'ne-hunter',
    title: '猎手',
    type: 'NE',
    emoji: '🎭',
    description: '你成为了顶级的"情感猎手"，擅长操控他人的情感。赚了很多钱，但失去了感受爱的能力。你赢得了游戏，但输掉了自己。',
    condition: '以上条件均不满足（兜底）',
  },
]

export const ENDING_TYPE_MAP: Record<string, { label: string; gradient: string }> = {
  BE: { label: '悲剧结局', gradient: 'linear-gradient(135deg, #1a0a0a, #3d1010)' },
  TE: { label: '转折结局', gradient: 'linear-gradient(135deg, #1a1a0a, #3d3010)' },
  HE: { label: '圆满结局', gradient: 'linear-gradient(135deg, #0a1a1a, #103d30)' },
  NE: { label: '平淡结局', gradient: 'linear-gradient(135deg, #0a0a1a, #101030)' },
}

// ── 故事信息 + 快捷操作 ──────────────────────────────

export const STORY_INFO = {
  title: '镜花缘',
  subtitle: '都市情感博弈交互叙事游戏',
  intro: '你刚刚经历了一段五年的感情——未婚夫在婚礼前三个月劈腿。\n\n带着千疮百孔的心，你下载了高端交友APP"镜花缘"。\n\n在这里，每个人都是一面镜子，你看到的，只是你想看到的。\n\n你有30天。寻找真爱，成为猎手，或者——救赎自己。',
}

export const QUICK_ACTIONS: string[] = [
  '💬 主动聊天',
  '🔍 暗中观察',
  '🎁 送出礼物',
  '💆 独处思考',
]

// ── 消息类型 ──────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  character?: string
  type?: 'scene-transition' | 'day-change'
  sceneId?: string
  dayInfo?: { day: number; period: string; chapter: string }
}

// ── 事件记录 ──────────────────────────────────────────

export interface StoryRecord {
  id: string
  day: number
  period: string
  title: string
  content: string
}

// ── 工具函数 ──────────────────────────────────────────

export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '深度羁绊', color: '#fbbf24' }
  if (value >= 60) return { level: 3, name: '关系亲密', color: '#10b981' }
  if (value >= 30) return { level: 2, name: '逐渐了解', color: '#3b82f6' }
  return { level: 1, name: '初步接触', color: '#94a3b8' }
}

export function getCurrentChapter(day: number): Chapter {
  return CHAPTERS.find((ch) => day >= ch.dayRange[0] && day <= ch.dayRange[1])
    ?? CHAPTERS[0]
}

export function getDayEvents(
  day: number,
  triggeredEvents: string[],
): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerDay === day && !triggeredEvents.includes(e.id),
  )
}
