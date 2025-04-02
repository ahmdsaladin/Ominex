import { useState, useEffect, useCallback, useRef } from 'react'
import { realtime, RealtimeEvent } from '../lib/realtime'

interface UseInfiniteScrollOptions<T> {
  initialData?: T[]
  pageSize?: number
  fetchData: (page: number, pageSize: number) => Promise<T[]>
  realtimeEventType?: string
  onRealtimeUpdate?: (event: RealtimeEvent) => void
  threshold?: number
}

export function useInfiniteScroll<T>({
  initialData = [],
  pageSize = 10,
  fetchData,
  realtimeEventType,
  onRealtimeUpdate,
  threshold = 0.8,
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<Error | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useRef<HTMLDivElement | null>(null)
  const unsubscribe = useRef<(() => void) | null>(null)

  // Initialize real-time updates
  useEffect(() => {
    if (realtimeEventType && onRealtimeUpdate) {
      unsubscribe.current = realtime.subscribe(realtimeEventType, onRealtimeUpdate)
    }

    return () => {
      if (unsubscribe.current) {
        unsubscribe.current()
      }
    }
  }, [realtimeEventType, onRealtimeUpdate])

  // Load initial data
  useEffect(() => {
    loadMore()
  }, [])

  // Set up intersection observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold,
    }

    observer.current = new IntersectionObserver(handleObserver, options)

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current)
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [threshold])

  // Update observer when last element changes
  useEffect(() => {
    if (lastElementRef.current && observer.current) {
      observer.current.observe(lastElementRef.current)
    }
  }, [data])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasMore && !loading) {
        loadMore()
      }
    },
    [hasMore, loading]
  )

  const loadMore = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const newData = await fetchData(page, pageSize)
      
      if (newData.length < pageSize) {
        setHasMore(false)
      }

      setData(prevData => [...prevData, ...newData])
      setPage(prevPage => prevPage + 1)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, fetchData])

  const refresh = useCallback(async () => {
    setData([])
    setPage(1)
    setHasMore(true)
    setError(null)
    await loadMore()
  }, [loadMore])

  const updateItem = useCallback((predicate: (item: T) => boolean, update: Partial<T>) => {
    setData(prevData =>
      prevData.map(item => (predicate(item) ? { ...item, ...update } : item))
    )
  }, [])

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setData(prevData => prevData.filter(item => !predicate(item)))
  }, [])

  return {
    data,
    loading,
    hasMore,
    error,
    refresh,
    updateItem,
    removeItem,
    lastElementRef,
  }
} 