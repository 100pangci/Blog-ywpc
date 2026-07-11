import { useContent, getAdjacent } from './useContent'
import type { Post } from './useContent'

export function useLifePosts() {
  return useContent('life')
}

export function getAdjacentLifePosts(currentSlug: string, langOverride?: string) {
  return getAdjacent('life', currentSlug, langOverride)
}

export type { Post }
