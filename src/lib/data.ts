/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 全部类型定义 + 常量 + 4角色/5场景/8道具/4章节/事件/6结局 + 工具函数
 * [POS]: 核心数据层，被 store.ts 消费，间接被所有组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 类型定义 ──────────────────────────────────────────

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

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

export interface Character {
  id: string
  name: string
  avatar: string
  fullImage: string
  gender: 'male' | 'female'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinDay: number
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

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

export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest' | 'scene-key'
  description: string
  maxCount?: number
}

export interface Chapter {
  id: number
  name: string
  dayRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

export interface ForcedEvent {
  id: string
  name: string
  triggerDay: number
  description: string
}

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'NE' | 'BE'
  description: string
  condition: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
}

// ── 常量 ──────────────────────────────────────────────

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

// ── StatMeta 模板 ─────────────────────────────────────

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

// ── 角色定义 ──────────────────────────────────────────

const QINGRANG: Character = {
  id: 'qingrang',
  name: '沈清让',
  avatar: '🎨',
  fullImage: '/characters/qingrang.jpg',
  gender: 'male',
  age: 32,
  title: '温柔艺术家',
  themeColor: '#a29bfe',
  joinDay: 1,
  description: '画廊策展人，温润如玉的文艺青年。180cm，偏瘦骨架纤细，桃花眼眼角带泪痣，冷白皮肤，左手腕戴木质佛珠。真实身份是情感陪伴师，按小时收费陪人聊天约会。',
  personality: '温柔细腻却保持距离感，极度害怕被抛弃。表面顺从内在渴望被掌控，用艺术逃避现实。对真心既渴望又恐惧，父母离异导致的不安全感根深蒂固。',
  speakingStyle: '语速慢如朗诵，轻声细语从不大声。长句多排比和比喻，用艺术术语形容感情。口癖："你知道吗…"、"也许吧"。避谈工作和交易。',
  secret: '真实职业是情感陪伴师，内心觉得自己"不干净"。存了一笔钱想金盆洗手开自己的画廊。极度害怕被抛弃是致命弱点。',
  triggerPoints: ['提及他的工作会触怒', '把他当商品评价会导致断联', '深夜时段情绪变动×1.5', '玩家提到"真心"时好感变动×2'],
  behaviorPatterns: '对示好会疑惑不安低头颤睫，对攻击不反驳只沉默黯然，被冷落会反复看玩家朋友圈。好感高时忽冷忽热——热情几天后突然推开。达到信任阈值会带玩家去真正的家。',
  statMetas: [
    ...RELATION_STATS,
    { key: 'dependency', label: '依赖', color: '#a29bfe', icon: '🫂', category: 'status', hidden: true },
    { key: 'inferiority', label: '自卑', color: '#636e72', icon: '😔', category: 'status', hidden: true },
  ],
  initialStats: { affection: 20, trust: 10, insight: 0, dependency: 0, inferiority: 70 },
}

const LINYUAN: Character = {
  id: 'linyuan',
  name: '顾临渊',
  avatar: '💼',
  fullImage: '/characters/linyuan.jpg',
  gender: 'male',
  age: 35,
  title: '霸道总裁',
  themeColor: '#e17055',
  joinDay: 1,
  description: '创业公司CEO，188cm健硕宽肩窄腰，国字脸丹凤眼如猎豹。小麦色皮肤左眉骨有疤，左腕百达翡丽手表。真实身份是杀猪盘骗子，五年前被白富美骗光积蓄后"黑化"。',
  personality: '霸道自信掌控欲强，说话直接不绕弯。内心是受伤的孩子，用强势保护自己。既渴望真爱又不敢相信，极度害怕被背叛。用"征服"来填补内心空洞。',
  speakingStyle: '语速快果断不容置疑，低沉有力如下命令。短句命令式，用商业术语形容感情。口癖："你应该…"、"我要你…"、"记住…"。避谈爱和真心。',
  secret: '真实身份是杀猪盘骗子，专门targeting情感脆弱的女性。一直在资助农村小学作为"赎罪"。好感度达90会崩溃坦白身份乞求原谅。',
  triggerPoints: ['质疑他的公司会触怒', '把他当提款机会触发收割', '玩家表现独立时好感×1.5', '玩家表现依赖时好感×0.5'],
  behaviorPatterns: '对示好会审视怀疑试图用礼物测试玩家，对攻击冷笑居高临下反而激起征服欲。被冷落会"偶然"出现在玩家面前。投入期会提出"投资建议"。好感达60进入投资陷阱阶段。',
  statMetas: [
    ...RELATION_STATS,
    { key: 'possessiveness', label: '占有', color: '#d63031', icon: '🔥', category: 'status', hidden: true },
    { key: 'guilt', label: '罪恶', color: '#636e72', icon: '⛓️', category: 'status', hidden: true },
  ],
  initialStats: { affection: 10, trust: 5, insight: 0, possessiveness: 0, guilt: 30 },
}

const XIAOLU: Character = {
  id: 'xiaolu',
  name: '林小鹿',
  avatar: '🦌',
  fullImage: '/characters/xiaolu.jpg',
  gender: 'male',
  age: 22,
  title: '阳光学弟',
  themeColor: '#00b894',
  joinDay: 1,
  description: '复旦大学生，178cm匀称阳光健康，圆脸杏眼琥珀色瞳仁，笑起来两个深酒窝。右脸颊一颗小黑痣，脖子银色项链。真实身份是APP官方托儿，被雇用提高女性用户活跃度。',
  personality: '阳光开朗话多像小太阳，看似单纯实则成熟敏感。对玩家有真实好感但合同禁止发展关系，内心极度矛盾。善良即使知道是工作也真心关心玩家。',
  speakingStyle: '语速快活泼像话痨，音量大充满活力。短句跳跃式疑问句多，用年轻人网络用语。口癖："哈哈"、"真的吗"、"好呀"。避谈工作和合同。',
  secret: '真实身份是APP托儿，按月领工资陪女性用户聊天。一直在存钱想辞职开咖啡店。对玩家的感情是真的，但合同让他无法坦白。',
  triggerPoints: ['被问"你是不是托儿"会断联', '深夜时段情绪变动×1.5', '玩家表现真心时好感变动×2', '好感达90会向APP辞职坦白'],
  behaviorPatterns: '对示好眼睛发亮笑容灿烂但内疚加深，对攻击低头眼眶微红委屈。暧昧期会说"我想你"但随后矛盾消失几天。挣扎期会问"如果我不是你想的那样，你还会喜欢我吗"。',
  statMetas: [
    ...RELATION_STATS,
    { key: 'remorse', label: '愧疚', color: '#fdcb6e', icon: '😣', category: 'status', hidden: true },
    { key: 'conflict', label: '矛盾', color: '#e17055', icon: '💫', category: 'status', hidden: true },
  ],
  initialStats: { affection: 30, trust: 20, insight: 0, remorse: 0, conflict: 50 },
}

const CHENZHOU: Character = {
  id: 'chenzhou',
  name: '陆沉舟',
  avatar: '🍵',
  fullImage: '/characters/chenzhou.jpg',
  gender: 'male',
  age: 42,
  title: '神秘大叔',
  themeColor: '#74b9ff',
  joinDay: 1,
  description: '神秘富豪，185cm儒雅深沉，长方形脸凤眼发际线略后移。灰白一字眉沉香木佛珠，左眉骨有疤。真实身份是镜花缘APP开发者，心理学家，妻子因病去世后创建此APP研究信任。',
  personality: '神秘智慧看透一切，说话富有哲理像人生导师。内心极度孤独，渴望被理解和陪伴。对实验有执念但逐渐对玩家产生真实感情，在"客观性"和"真心"间挣扎。',
  speakingStyle: '语速慢从容如朗诵，轻柔不大声。长句排比比喻，用心理学和哲学术语。口癖："你知道吗…"、"也许吧"。避谈亡妻和实验。',
  secret: '是镜花缘APP的开发者，用这个平台研究"被背叛过的人如何重新建立信任"。妻子去世是他最大的伤痛。发现自己对玩家产生真实感情后想结束实验。',
  triggerPoints: ['提及亡妻会沉默断联', '被说"你在观察我"会触怒', '玩家表现独特时好感×2', '深夜情绪变动×1.5'],
  behaviorPatterns: '对示好疑惑不安但内心温暖，对攻击沉默黯然不反驳。观察期像看实验对象提问人生哲学，信任期展示实验数据。好感高时会带玩家看实验报告。',
  statMetas: [
    ...RELATION_STATS,
    { key: 'interest', label: '兴趣', color: '#74b9ff', icon: '🧐', category: 'status', hidden: true },
    { key: 'loneliness', label: '孤独', color: '#636e72', icon: '🌑', category: 'status', hidden: true },
  ],
  initialStats: { affection: 10, trust: 5, insight: 0, interest: 50, loneliness: 70 },
}

export function buildCharacters(): Record<string, Character> {
  return {
    qingrang: QINGRANG,
    linyuan: LINYUAN,
    xiaolu: XIAOLU,
    chenzhou: CHENZHOU,
  }
}

// ── 场景 ──────────────────────────────────────────────

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

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '镜花水月',
    dayRange: [1, 7],
    description: '初识与伪装。注册APP，收到系统推送的4位男性，每个人都看似完美。',
    objectives: ['与至少3位男性建立联系', '识破至少1位男性的伪装', '发现APP的"算法秘密"'],
    atmosphere: '轻松期待略带警惕，蜜月期的甜蜜与隐忧并存',
  },
  {
    id: 2,
    name: '雾里看花',
    dayRange: [8, 14],
    description: '试探与博弈。开始发现男性角色的破绽，面临揭穿还是利用的选择。',
    objectives: ['与至少1位男性好感度达50', '收集至少1份证据', '触发深夜对话事件'],
    atmosphere: '紧张刺激患得患失，博弈的快感与不安交织',
  },
  {
    id: 3,
    name: '水落石出',
    dayRange: [15, 21],
    description: '真相与抉择。触发真相事件，业障值或真心值达到临界点，必须做出关键选择。',
    objectives: ['触发至少1位男性的真相事件', '面对前未婚夫的消息', '发现镜花缘APP的真正目的'],
    atmosphere: '沉重痛苦但充满希望，谎言开始崩塌真相浮出水面',
  },
  {
    id: 4,
    name: '镜破重圆',
    dayRange: [22, 30],
    description: '结局与新生。最终抉择，没有回头路。每个选择都将决定你的结局。',
    objectives: ['达成游戏目标', '解决与前未婚夫的恩怨', '做出最终选择'],
    atmosphere: '悲壮释然或绝望，最后一章没有重来的机会',
  },
]

// ── 强制事件 ──────────────────────────────────────────

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

export const ENDINGS: Ending[] = [
  {
    id: 'te-mirror',
    name: '镜花水月',
    type: 'TE',
    description: '发现一切都是实验，但实验的意义是证明——即使在最虚假的环境中，真爱依然存在。你不仅完成了游戏，还完成了一个关于人性的实验。',
    condition: '与陆沉舟好感度100 + 触发开发者模式',
  },
  {
    id: 'he-truelove',
    name: '破镜重圆',
    type: 'HE',
    description: '你和他坦诚相见，彼此接纳对方的不完美。虽然过程曲折，但最终找到了真爱。即使被伤害过，仍然可以重新相信爱情。',
    condition: '某位NPC好感度≥80 + 真心值≥60 + 业障值≤40 + 触发真相事件并选择原谅',
  },
  {
    id: 'he-self',
    name: '独美',
    type: 'HE',
    description: '你不需要通过他人的认可来证明自己的价值。你选择独自美丽，专注于自己的事业和成长。爱情不是人生的全部。',
    condition: '真心值≥80 + 自信值≥80 + 所有NPC好感度40-60',
  },
  {
    id: 'ne-hunter',
    name: '猎手',
    type: 'NE',
    description: '你成为了顶级的"情感猎手"，擅长操控他人的情感。赚了很多钱，但失去了感受爱的能力。你赢得了游戏，但输掉了自己。',
    condition: '业障值≥80 + 红包总价值≥500000 + 真心值≤40',
  },
  {
    id: 'be-social-death',
    name: '社死',
    type: 'BE',
    description: '你的欺骗行为被曝光，个人信息被泄露，遭受网络暴力。失去了工作、朋友和尊严。网络不是法外之地。',
    condition: '业障值≥90 + 触发反噬事件 + 选择反击或逃避',
  },
  {
    id: 'be-heartdead',
    name: '行尸走肉',
    type: 'BE',
    description: '你失去了感受爱的能力，即使遇到真心对你好的人，也无法相信。你保护了自己，但也杀死了自己。',
    condition: '真心值≤10 + 业障值≥60',
  },
]

// ── 故事信息 ──────────────────────────────────────────

export const STORY_INFO = {
  title: '镜花缘',
  subtitle: '都市情感博弈交互叙事游戏',
  intro: '你刚刚经历了一段五年的感情——未婚夫在婚礼前三个月劈腿。\n\n带着千疮百孔的心，你下载了高端交友APP"镜花缘"。\n\n在这里，每个人都是一面镜子，你看到的，只是你想看到的。\n\n你有30天。寻找真爱，成为猎手，或者——救赎自己。',
  objectives: [
    '🌹 路线A·寻找真爱：找到那个"对的人"，让他敞开心扉',
    '💰 路线B·情感投资：通过"情感操控"获取总价值50万的回报',
    '🦋 路线C·自我救赎：不追求外部目标，治愈自己的内心创伤',
  ],
}

// ── 工具函数 ──────────────────────────────────────────

export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '深度羁绊', color: '#fbbf24' }
  if (value >= 60) return { level: 3, name: '关系亲密', color: '#10b981' }
  if (value >= 30) return { level: 2, name: '逐渐了解', color: '#3b82f6' }
  return { level: 1, name: '初步接触', color: '#94a3b8' }
}

export function getAvailableCharacters(
  day: number,
  characters: Record<string, Character>
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, char]) => char.joinDay <= day)
  )
}

export function getCurrentChapter(day: number): Chapter {
  return CHAPTERS.find((ch) => day >= ch.dayRange[0] && day <= ch.dayRange[1])
    ?? CHAPTERS[0]
}

export function getDayEvents(
  day: number,
  triggeredEvents: string[]
): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerDay === day && !triggeredEvents.includes(e.id)
  )
}
