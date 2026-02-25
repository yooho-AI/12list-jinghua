/**
 * [INPUT]: 依赖 @/lib/stream 的 chat
 * [OUTPUT]: 对外提供分析/生成函数及风格常量
 * [POS]: lib 的高光时刻 API 封装，被 highlight-modal 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { chat } from './stream'

// ── 类型 ─────────────────────────────────────────────

export type HighlightType = 'bond' | 'conflict' | 'growth' | 'crisis'
export type VideoStyle = 'noir' | 'anime' | 'cinematic' | 'watercolor'
export type ComicStyle = 'shoujo' | 'shounen' | 'webtoon' | 'doodle'

export interface Highlight {
  highlightId: string
  title: string
  summary: string
  type: HighlightType
  characters: { id: string; name: string }[]
  emotionalScore: number
}

// ── 风格常量 — 都市情感主题色 #e84393 ────────────────

export const HIGHLIGHT_TYPES: Record<HighlightType, { icon: string; label: string; color: string }> = {
  bond: { icon: '💕', label: '羁绊共鸣', color: '#e84393' },
  conflict: { icon: '⚡', label: '矛盾冲突', color: '#ef4444' },
  growth: { icon: '🌟', label: '成长蜕变', color: '#ffd700' },
  crisis: { icon: '🔥', label: '危机时刻', color: '#f97316' },
}

export const VIDEO_STYLES: Record<VideoStyle, { label: string; desc: string; prompt: string }> = {
  noir: { label: '都市黑色', desc: '霓虹灯影、暗调氛围', prompt: '都市noir风格，上海夜景霓虹灯，暗调高对比，电影质感' },
  anime: { label: '日系动漫', desc: '赛璐珞上色、柔和光影', prompt: '日系动画风格，赛璐珞上色，柔和光影，现代上海都市背景' },
  cinematic: { label: '写实电影', desc: '自然光影、电影构图', prompt: '都市情感电影质感，自然光影，浅景深，上海法租界背景' },
  watercolor: { label: '水墨意境', desc: '淡雅水墨、东方韵味', prompt: '现代水墨风格，淡雅留白，东方意境，都市人物水墨画' },
}

export const COMIC_STYLES: Record<ComicStyle, { label: string; desc: string; prompt: string }> = {
  shoujo: { label: '少女漫画', desc: '花瓣特效、梦幻氛围', prompt: 'Q版少女漫画风格，大头小身2:1比例，现代都市约会，花瓣星星特效' },
  shounen: { label: '少年漫画', desc: '硬朗线条、张力构图', prompt: 'Q版少年漫画风格，大头小身2:1比例，都市悬疑，速度线，紧张表情' },
  webtoon: { label: '韩漫条漫', desc: '精致上色、网感强', prompt: 'Q版韩漫风格，大头小身2:1比例，都市交友APP，精致数码上色' },
  doodle: { label: '手绘涂鸦', desc: '随性笔触、轻松氛围', prompt: 'Q版手绘涂鸦风格，大头小身2:1比例，约会日常，铅笔随性笔触' },
}

// ── AI 分析 ──────────────────────────────────────────

export async function analyzeHighlights(
  dialogues: { role: string; content: string }[],
): Promise<Highlight[]> {
  const dialogueText = dialogues
    .map((d, i) => `${i + 1}. [${d.role}]: ${d.content}`)
    .join('\n')

  const prompt = `你是一个专业的都市情感剧情分析师。请分析以下《镜花缘》的对话，提取2-4个最精彩的高光片段。

## 对话历史
${dialogueText}

## 涉及角色
沈清让（温柔艺术家/情感陪伴师）、顾临渊（霸道总裁/杀猪盘骗子）、林小鹿（阳光学弟/APP托儿）、陆沉舟（神秘大叔/APP开发者）

## 输出要求
请以 JSON 数组格式返回，每个片段包含：
- highlightId: 唯一ID (如 "hl_001")
- title: 片段标题 (6-10字，情感悬疑风格)
- summary: 内容摘要 (20-40字)
- type: 片段类型 (bond/conflict/growth/crisis)
- characters: 涉及角色数组 [{id, name}]
- emotionalScore: 情感强度 (0-100)

只返回 JSON 数组，不要其他内容。`

  const content = await chat([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Highlight[]
  } catch {
    console.error('[Highlight] 解析失败:', content)
  }
  return []
}

// ── 火山方舟 Ark API ─────────────────────────────────

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = '8821c4b7-6a64-44b9-a9d7-de1ffc36ff41'

const arkHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ARK_API_KEY}`,
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seedream-4-5-251128',
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`图片生成失败: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('未返回图片 URL')
  return url
}

export async function generateVideo(
  prompt: string,
  imageUrl?: string,
): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const content: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: 'text', text: `${prompt}  --duration 5 --camerafixed false --watermark true` },
  ]

  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  }

  try {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: arkHeaders,
      body: JSON.stringify({ model: 'doubao-seedance-1-5-pro-251215', content }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { error: data.error?.message || `视频生成失败: ${res.status}` }
    }
    return { taskId: data.id || data.task_id, videoUrl: data.output?.video_url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '视频生成请求失败' }
  }
}

export async function queryVideoTask(taskId: string): Promise<{
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  videoUrl?: string
  error?: string
}> {
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
    method: 'GET',
    headers: arkHeaders,
  })

  const data = await res.json()
  if (!res.ok) return { status: 'failed', error: data.error?.message || '查询失败' }

  return {
    status: data.status || 'pending',
    videoUrl: data.output?.video_url || data.content?.[0]?.url,
  }
}

// ── Prompt 构建 — 都市情感主题 ───────────────────────

const EMOTION_MAP: Record<HighlightType, { image: string; video: string }> = {
  bond: { image: '温暖微笑、暧昧心动、粉色霓虹光晕', video: '暖色调柔光，角色深情互动，上海夜景' },
  conflict: { image: '紧张对峙、眼神锐利、冷色暗调', video: '快节奏剪辑，戏剧性对比，紧张悬疑氛围' },
  growth: { image: '破茧蜕变、自信绽放、金色光效', video: '慢镜头，柔和光线，蜕变觉醒时刻' },
  crisis: { image: '揭穿谎言、泪光闪烁、暗色光影', video: '戏剧性推拉镜头，明暗对比强烈' },
}

export function buildImagePrompt(highlight: Highlight, style: ComicStyle): string {
  const styleInfo = COMIC_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].image

  return `${styleInfo.prompt}。上海法租界，高端交友APP约会场景，梧桐树霓虹灯光，都市夜景。
角色：${highlight.characters.map((c) => c.name).join('、')}，现代都市时尚服装。
剧情：${highlight.summary}
情绪：${emotion}
排版：4-6格漫画分镜，黑色分格边框，对话气泡框，高清精致`
}

export function buildVideoPrompt(highlight: Highlight, style: VideoStyle): string {
  const styleInfo = VIDEO_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].video

  return `${styleInfo.prompt}。上海法租界，高端交友APP约会，梧桐树霓虹灯光。
剧情：${highlight.summary}
角色：${highlight.characters.map((c) => c.name).join('、')}，都市时尚服装
情绪：${emotion}
镜头：5秒短片，角色表情生动，都市情感氛围`
}
