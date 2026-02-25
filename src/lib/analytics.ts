/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 trackEvent 及预定义事件追踪函数
 * [POS]: lib 的数据统计模块，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void
    }
  }
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(name, data)
  }
}

// ── 预定义事件 — jh_ 前缀 ───────────────────────────

export function trackGameStart() {
  trackEvent('jh_game_start')
}

export function trackGameContinue() {
  trackEvent('jh_game_continue')
}

export function trackTimeAdvance(day: number, period: string) {
  trackEvent('jh_time_advance', { day, period })
}

export function trackPlayerCreate(name: string) {
  trackEvent('jh_player_create', { name })
}

export function trackChapterEnter(chapter: number) {
  trackEvent('jh_chapter_enter', { chapter })
}

export function trackEndingReached(ending: string) {
  trackEvent('jh_ending_reached', { ending })
}

export function trackSceneUnlock(scene: string) {
  trackEvent('jh_scene_unlock', { scene })
}

export function trackItemUse(item: string) {
  trackEvent('jh_item_use', { item })
}
