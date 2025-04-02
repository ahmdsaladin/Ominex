import { useState, useEffect, useCallback } from 'react'
import { ai } from '../lib/ai'
import { Post, ContentType } from '../types'
import { useAuth } from './useAuth'

interface UseContentRecommendationsReturn {
  posts: Post[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useContentRecommendations(
  limit: number = 20
): UseContentRecommendationsReturn {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const loadPosts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const newPosts = await ai.getPersonalizedFeed(user.id, limit)
      setPosts((prev) => [...prev, ...newPosts])
      setHasMore(newPosts.length === limit)
      setOffset((prev) => prev + newPosts.length)
    } catch (error) {
      console.error('Error loading recommended posts:', error)
      setError(error instanceof Error ? error : new Error('Failed to load posts'))
    } finally {
      setLoading(false)
    }
  }, [user, limit])

  // Initial load
  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  // Refresh posts
  const refresh = useCallback(async () => {
    setPosts([])
    setOffset(0)
    setHasMore(true)
    await loadPosts()
  }, [loadPosts])

  // Load more posts
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadPosts()
  }, [hasMore, loading, loadPosts])

  return {
    posts,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
  }
} 