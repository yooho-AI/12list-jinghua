/**
 * [INPUT]: 无外部依赖（颜色硬编码，避免循环依赖）
 * [OUTPUT]: 对外提供 parseStoryParagraph, parseInlineContent, escapeHtml
 * [POS]: lib 的 AI 回复文本解析器，被 dialogue-panel 和 mobile-layout 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 角色配色（4 NPC 硬编码） ─────────────────────────

const CHARACTER_COLORS: Record<string, string> = {
  '沈清让': '#a29bfe',
  '顾临渊': '#e17055',
  '林小鹿': '#00b894',
  '陆沉舟': '#74b9ff',
}

// ── 数值配色（角色数值 + 玩家数值 + 全局资源） ──────

const STAT_COLORS: Record<string, string> = {
  '好感': '#ef4444', '好感度': '#ef4444',
  '信任': '#22c55e', '信任度': '#22c55e',
  '识破': '#f59e0b', '识破度': '#f59e0b',
  '依赖': '#a29bfe', '依赖度': '#a29bfe',
  '自卑': '#636e72', '自卑感': '#636e72',
  '占有': '#d63031', '占有欲': '#d63031',
  '罪恶': '#636e72', '罪恶感': '#636e72',
  '愧疚': '#fdcb6e', '愧疚感': '#fdcb6e',
  '矛盾': '#e17055', '矛盾值': '#e17055',
  '兴趣': '#74b9ff', '兴趣度': '#74b9ff',
  '孤独': '#636e72', '孤独感': '#636e72',
  '真心': '#e84393', '真心值': '#e84393',
  '业障': '#6c5ce7', '业障值': '#6c5ce7',
  '自信': '#00b894', '自信值': '#00b894',
  '红包': '#ffd700', '礼物': '#ffd700',
}

// ── HTML 转义 ────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── 行内解析（动作/对话/纯文本） ─────────────────────

export function parseInlineContent(text: string): string {
  if (!text) return ''
  let result = ''
  let remaining = text
  let safety = 0

  while (remaining.length > 0 && safety < 100) {
    safety++
    remaining = remaining.trim()
    if (!remaining) break

    const actionMatch = remaining.match(/^[（(]([^）)]+)[）)]/)
    if (actionMatch) {
      result += `<span class="action">（${escapeHtml(actionMatch[1])}）</span>`
      remaining = remaining.slice(actionMatch[0].length)
      continue
    }

    const starMatch = remaining.match(/^\*([^*]+)\*/)
    if (starMatch) {
      result += `<span class="action">*${escapeHtml(starMatch[1])}*</span>`
      remaining = remaining.slice(starMatch[0].length)
      continue
    }

    const dialogueMatch = remaining.match(/^[""\u201c]([^""\u201d]+)[""\u201d]/)
    if (dialogueMatch) {
      result += `<span class="dialogue">\u201c${escapeHtml(dialogueMatch[1])}\u201d</span>`
      remaining = remaining.slice(dialogueMatch[0].length)
      continue
    }

    const nextAction = remaining.search(/[（(]/)
    const nextStar = remaining.search(/\*/)
    const nextDialogue = remaining.search(/[""\u201c]/)
    const positions = [nextAction, nextStar, nextDialogue].filter((p) => p > 0)

    if (positions.length > 0) {
      const nextPos = Math.min(...positions)
      const plain = remaining.slice(0, nextPos).trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      remaining = remaining.slice(nextPos)
    } else {
      const plain = remaining.trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      break
    }
  }
  return result
}

// ── 段落解析（叙事 + 数值变化分离） ─────────────────

export function parseStoryParagraph(content: string): { narrative: string; statHtml: string } {
  if (!content) return { narrative: '', statHtml: '' }

  const lines = content.split('\n').filter((l) => l.trim())
  const storyParts: string[] = []
  const statChanges: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 数值变化行 【好感度+2】
    const statMatch = trimmed.match(/^【([^】]*[+-]\d+[^】]*)】$/)
    if (statMatch) {
      statChanges.push(statMatch[1])
      continue
    }

    // 【角色名】开头
    const charMatch = trimmed.match(/^【([^】]+)】(.*)/)
    if (charMatch) {
      const charName = charMatch[1]
      const rest = charMatch[2].trim()
      if (charName.match(/[+-]\d+/)) {
        statChanges.push(charName)
        continue
      }
      const color = CHARACTER_COLORS[charName] || '#e84393'
      const lineHtml = parseInlineContent(rest)
      storyParts.push(
        `<p class="dialogue-line"><span class="char-name" style="color:${color}">【${escapeHtml(charName)}】</span>${lineHtml}</p>`,
      )
      continue
    }

    // 纯旁白 vs 混合内容
    const hasDialogue = trimmed.match(/[""\u201c][^""\u201d]+[""\u201d]/)
    const hasAction = trimmed.match(/[（(][^）)]+[）)]/) || trimmed.match(/\*[^*]+\*/)
    if (!hasDialogue && !hasAction) {
      storyParts.push(`<p class="narration">${escapeHtml(trimmed)}</p>`)
    } else {
      const lineHtml = parseInlineContent(trimmed)
      if (lineHtml) storyParts.push(`<p class="dialogue-line">${lineHtml}</p>`)
    }
  }

  let statHtml = ''
  if (statChanges.length > 0) {
    const statText = statChanges
      .map((s) => {
        let color = '#9b9a97'
        for (const [keyword, c] of Object.entries(STAT_COLORS)) {
          if (s.includes(keyword)) { color = c; break }
        }
        return `<span style="color:${color}">【${escapeHtml(s)}】</span>`
      })
      .join(' ')
    statHtml = `<p class="narration" style="font-style:normal;border-left:none;padding-left:0;margin-bottom:0;font-size:13px">${statText}</p>`
  }

  return { narrative: storyParts.join(''), statHtml }
}
