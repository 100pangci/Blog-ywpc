import { useContent, getAdjacent } from './useContent'
import type { Post } from './useContent'

export function usePosts() {
  return useContent('posts')
}

export function getAdjacentPosts(currentSlug: string, langOverride?: string) {
  return getAdjacent('posts', currentSlug, langOverride)
}

export type { Post }
