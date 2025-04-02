import Redis from 'ioredis'
import { env } from '../env'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
}

export class CacheService {
  private static instance: CacheService
  private redis: Redis
  private enabled: boolean

  private constructor() {
    this.enabled = env.REDIS_URL !== undefined
    if (this.enabled) {
      this.redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      })

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error)
      })
    }
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null

    try {
      const data = await this.redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.enabled) return

    try {
      const serialized = JSON.stringify(value)
      if (options.ttl) {
        await this.redis.setex(key, options.ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) return

    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) return

    try {
      await this.redis.flushall()
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetchFn()
    await this.set(key, value, options)
    return value
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.enabled) return

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error)
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return true

    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error('Cache health check failed:', error)
      return false
    }
  }
}

export const cache = CacheService.getInstance() 