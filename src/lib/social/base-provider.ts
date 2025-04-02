import {
  SocialMediaProvider,
  SocialMediaProfile,
  SocialMediaPost,
  SocialMediaComment,
  SocialMediaStats,
  SocialMediaAuth,
  SocialMediaConfig,
  SocialMediaError
} from './types'

export abstract class BaseSocialProvider implements SocialMediaProvider {
  abstract platform: SocialPlatform
  abstract name: string
  abstract version: string
  abstract baseUrl: string
  abstract apiUrl: string
  abstract scopes: string[]
  abstract features: SocialMediaFeature[]

  protected config: SocialMediaConfig
  protected auth: SocialMediaAuth | null = null

  constructor(config: SocialMediaConfig) {
    this.config = config
  }

  // Authentication methods
  abstract getAuthUrl(): string
  abstract handleAuthCallback(code: string): Promise<SocialMediaAuth>
  abstract refreshToken(): Promise<SocialMediaAuth>
  abstract revokeToken(): Promise<void>

  // Profile methods
  abstract getProfile(userId: string): Promise<SocialMediaProfile>
  abstract updateProfile(profile: Partial<SocialMediaProfile>): Promise<SocialMediaProfile>
  abstract getFollowers(userId: string, limit?: number): Promise<SocialMediaProfile[]>
  abstract getFollowing(userId: string, limit?: number): Promise<SocialMediaProfile[]>

  // Post methods
  abstract createPost(post: Omit<SocialMediaPost, 'platform' | 'postId' | 'userId'>): Promise<SocialMediaPost>
  abstract getPost(postId: string): Promise<SocialMediaPost>
  abstract updatePost(postId: string, post: Partial<SocialMediaPost>): Promise<SocialMediaPost>
  abstract deletePost(postId: string): Promise<void>
  abstract getPosts(userId: string, limit?: number): Promise<SocialMediaPost[]>
  abstract likePost(postId: string): Promise<void>
  abstract unlikePost(postId: string): Promise<void>
  abstract sharePost(postId: string, message?: string): Promise<void>

  // Comment methods
  abstract createComment(postId: string, content: string): Promise<SocialMediaComment>
  abstract getComments(postId: string, limit?: number): Promise<SocialMediaComment[]>
  abstract deleteComment(commentId: string): Promise<void>
  abstract likeComment(commentId: string): Promise<void>
  abstract unlikeComment(commentId: string): Promise<void>

  // Stats methods
  abstract getStats(userId: string): Promise<SocialMediaStats>
  abstract getEngagementMetrics(postId: string): Promise<{
    likes: number
    comments: number
    shares: number
    views: number
    engagementRate: number
  }>

  // Utility methods
  protected async handleRequest<T>(
    request: () => Promise<T>,
    retries: number = this.config.retries || 3
  ): Promise<T> {
    let lastError: Error | null = null

    for (let i = 0; i < retries; i++) {
      try {
        return await request()
      } catch (error) {
        lastError = error as Error
        if (this.isRateLimitError(error)) {
          await this.handleRateLimit(error)
        } else if (this.isAuthError(error)) {
          await this.handleAuthError(error)
        } else {
          throw this.createError(error)
        }
      }
    }

    throw this.createError(lastError)
  }

  protected isRateLimitError(error: any): boolean {
    return error?.status === 429 || error?.code === 'RATE_LIMIT_EXCEEDED'
  }

  protected isAuthError(error: any): boolean {
    return error?.status === 401 || error?.code === 'INVALID_TOKEN'
  }

  protected async handleRateLimit(error: any): Promise<void> {
    const retryAfter = error?.retryAfter || 60 // Default to 60 seconds
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  }

  protected async handleAuthError(error: any): Promise<void> {
    if (this.auth?.refreshToken) {
      await this.refreshToken()
    } else {
      throw this.createError(error)
    }
  }

  protected createError(error: any): SocialMediaError {
    return {
      platform: this.platform,
      name: error?.name || 'SocialMediaError',
      message: error?.message || 'An unknown error occurred',
      code: error?.code || 'UNKNOWN_ERROR',
      status: error?.status,
      details: error?.details
    }
  }

  protected validateAuth(): void {
    if (!this.auth) {
      throw this.createError({
        code: 'NOT_AUTHENTICATED',
        message: 'Provider is not authenticated'
      })
    }

    if (this.auth.tokenExpiresAt && new Date() >= this.auth.tokenExpiresAt) {
      throw this.createError({
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      })
    }
  }
} 