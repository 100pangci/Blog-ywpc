// life 列表 — 对 useContent 的 life 类型封装
import { useContent, getAdjacent } from './useContent'
import type { Post } from './useContent'

export function useLifePosts() {
  return useContent('life')
}

export function getAdjacentLifePosts(currentSlug: string, langOverride?: string) {
  return getAdjacent('life', currentSlug, langOverride)
}

export type { Post }
