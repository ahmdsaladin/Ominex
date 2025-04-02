import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import {
  SocialPlatform,
  SocialMediaProfile,
  SocialMediaPost,
  SocialMediaComment,
  SocialMediaStats,
  SocialMediaAuth,
  SocialMediaConfig,
  SocialMediaError
} from './types'
import { BaseSocialProvider } from './base-provider'
import { FacebookProvider } from './providers/facebook'
import { InstagramProvider } from './providers/instagram'
import { TwitterProvider } from './providers/twitter'
import { LinkedInProvider } from './providers/linkedin'
import { TikTokProvider } from './providers/tiktok'
import { SnapchatProvider } from './providers/snapchat'
import { YouTubeProvider } from './providers/youtube'
import { RedditProvider } from './providers/reddit'
import { PinterestProvider } from './providers/pinterest'
import { TelegramProvider } from './providers/telegram'
import { DiscordProvider } from './providers/discord'
import { MastodonProvider } from './providers/mastodon'
import { BlueSkyProvider } from './providers/bluesky'

export class SocialService {
  private static instance: SocialService
  private prisma: PrismaClient
  private redis: Redis
  private providers: Map<SocialPlatform, BaseSocialProvider>
  private readonly CACHE_TTL = 3600 // 1 hour

  private constructor() {
    this.prisma = new PrismaClient()
    this.redis = new Redis(process.env.REDIS_URL)
    this.providers = new Map()
  }

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService()
    }
    return SocialService.instance
  }

  async initialize(): Promise<void> {
    // Initialize all providers
    await Promise.all([
      this.initializeProvider('FACEBOOK', FacebookProvider),
      this.initializeProvider('INSTAGRAM', InstagramProvider),
      this.initializeProvider('TWITTER', TwitterProvider),
      this.initializeProvider('LINKEDIN', LinkedInProvider),
      this.initializeProvider('TIKTOK', TikTokProvider),
      this.initializeProvider('SNAPCHAT', SnapchatProvider),
      this.initializeProvider('YOUTUBE', YouTubeProvider),
      this.initializeProvider('REDDIT', RedditProvider),
      this.initializeProvider('PINTEREST', PinterestProvider),
      this.initializeProvider('TELEGRAM', TelegramProvider),
      this.initializeProvider('DISCORD', DiscordProvider),
      this.initializeProvider('MASTODON', MastodonProvider),
      this.initializeProvider('BLUESKY', BlueSkyProvider)
    ])
  }

  private async initializeProvider<T extends BaseSocialProvider>(
    platform: SocialPlatform,
    ProviderClass: new (config: SocialMediaConfig) => T
  ): Promise<void> {
    const config = await this.getProviderConfig(platform)
    if (config) {
      const provider = new ProviderClass(config)
      this.providers.set(platform, provider)
    }
  }

  private async getProviderConfig(platform: SocialPlatform): Promise<SocialMediaConfig | null> {
    const config = await this.prisma.socialConfig.findUnique({
      where: { platform }
    })

    if (!config) {
      return null
    }

    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      apiVersion: config.apiVersion,
      timeout: config.timeout,
      retries: config.retries,
      rateLimit: config.rateLimit
    }
  }

  getProvider(platform: SocialPlatform): BaseSocialProvider {
    const provider = this.providers.get(platform)
    if (!provider) {
      throw this.createError({
        code: 'PROVIDER_NOT_FOUND',
        message: `Provider not found for platform: ${platform}`
      })
    }
    return provider
  }

  async getAuthUrl(platform: SocialPlatform): Promise<string> {
    const provider = this.getProvider(platform)
    return provider.getAuthUrl()
  }

  async handleAuthCallback(
    platform: SocialPlatform,
    code: string
  ): Promise<SocialMediaAuth> {
    const provider = this.getProvider(platform)
    const auth = await provider.handleAuthCallback(code)
    await this.saveAuth(platform, auth)
    return auth
  }

  async refreshToken(platform: SocialPlatform): Promise<SocialMediaAuth> {
    const provider = this.getProvider(platform)
    const auth = await provider.refreshToken()
    await this.saveAuth(platform, auth)
    return auth
  }

  async revokeToken(platform: SocialPlatform): Promise<void> {
    const provider = this.getProvider(platform)
    await provider.revokeToken()
    await this.deleteAuth(platform)
  }

  async getProfile(
    platform: SocialPlatform,
    userId: string
  ): Promise<SocialMediaProfile> {
    const cacheKey = `profile:${platform}:${userId}`
    const cachedProfile = await this.redis.get(cacheKey)
    if (cachedProfile) {
      return JSON.parse(cachedProfile)
    }

    const provider = this.getProvider(platform)
    const profile = await provider.getProfile(userId)
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(profile))
    return profile
  }

  async getPosts(
    platform: SocialPlatform,
    userId: string,
    limit?: number
  ): Promise<SocialMediaPost[]> {
    const cacheKey = `posts:${platform}:${userId}:${limit || 'all'}`
    const cachedPosts = await this.redis.get(cacheKey)
    if (cachedPosts) {
      return JSON.parse(cachedPosts)
    }

    const provider = this.getProvider(platform)
    const posts = await provider.getPosts(userId, limit)
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(posts))
    return posts
  }

  async getStats(
    platform: SocialPlatform,
    userId: string
  ): Promise<SocialMediaStats> {
    const cacheKey = `stats:${platform}:${userId}`
    const cachedStats = await this.redis.get(cacheKey)
    if (cachedStats) {
      return JSON.parse(cachedStats)
    }

    const provider = this.getProvider(platform)
    const stats = await provider.getStats(userId)
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(stats))
    return stats
  }

  private async saveAuth(platform: SocialPlatform, auth: SocialMediaAuth): Promise<void> {
    await this.prisma.socialAuth.upsert({
      where: {
        platform_userId: {
          platform,
          userId: auth.userId
        }
      },
      update: {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        tokenExpiresAt: auth.tokenExpiresAt,
        scope: auth.scope,
        metadata: auth.metadata
      },
      create: {
        platform,
        userId: auth.userId,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        tokenExpiresAt: auth.tokenExpiresAt,
        scope: auth.scope,
        metadata: auth.metadata
      }
    })
  }

  private async deleteAuth(platform: SocialPlatform): Promise<void> {
    await this.prisma.socialAuth.deleteMany({
      where: { platform }
    })
  }

  private createError(error: any): SocialMediaError {
    return {
      platform: 'UNKNOWN',
      name: error?.name || 'SocialMediaError',
      message: error?.message || 'An unknown error occurred',
      code: error?.code || 'UNKNOWN_ERROR',
      status: error?.status,
      details: error?.details
    }
  }

  async shutdown(): Promise<void> {
    // Clean up resources
    await this.prisma.$disconnect()
    await this.redis.quit()
  }
} 