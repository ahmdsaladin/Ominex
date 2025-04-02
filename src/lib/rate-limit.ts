import { Redis } from 'ioredis'
import { env } from './env'

const redis = new Redis(env.REDIS_URL)

export interface RateLimitConfig {
  limit: number
  window: number // in seconds
}

export class RateLimiter {
  private redis: Redis
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.redis = redis
    this.config = config
  }

  async isRateLimited(key: string): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - this.config.window * 1000

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart)

    // Count entries in window
    const count = await this.redis.zcard(key)

    if (count >= this.config.limit) {
      return true
    }

    // Add new entry
    await this.redis.zadd(key, now, `${now}-${Math.random()}`)

    // Set expiry on the key
    await this.redis.expire(key, this.config.window)

    return false
  }

  async getRemainingRequests(key: string): Promise<number> {
    const now = Date.now()
    const windowStart = now - this.config.window * 1000

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart)

    // Count entries in window
    const count = await this.redis.zcard(key)

    return Math.max(0, this.config.limit - count)
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key)
  }
}

// Create rate limiters for different endpoints
export const rateLimiters = {
  // API rate limits
  api: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  auth: new RateLimiter({ limit: 5, window: 60 }), // 5 login attempts per minute
  upload: new RateLimiter({ limit: 10, window: 60 }), // 10 uploads per minute
  messaging: new RateLimiter({ limit: 50, window: 60 }), // 50 messages per minute
  
  // Platform-specific rate limits
  facebook: new RateLimiter({ limit: 200, window: 60 }), // 200 requests per minute
  instagram: new RateLimiter({ limit: 200, window: 60 }), // 200 requests per minute
  twitter: new RateLimiter({ limit: 300, window: 60 }), // 300 requests per minute
  linkedin: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  tiktok: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  youtube: new RateLimiter({ limit: 10000, window: 86400 }), // 10000 requests per day
  snapchat: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  reddit: new RateLimiter({ limit: 60, window: 60 }), // 60 requests per minute
  discord: new RateLimiter({ limit: 50, window: 60 }), // 50 requests per minute
  telegram: new RateLimiter({ limit: 30, window: 60 }), // 30 requests per minute
  whatsapp: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  pinterest: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  twitch: new RateLimiter({ limit: 800, window: 60 }), // 800 requests per minute
  medium: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  wechat: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
  threads: new RateLimiter({ limit: 100, window: 60 }), // 100 requests per minute
} 