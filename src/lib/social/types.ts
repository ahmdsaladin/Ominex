export interface SocialMediaProfile {
  platform: SocialPlatform
  userId: string
  username: string
  displayName?: string
  profileUrl?: string
  avatarUrl?: string
  bio?: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isVerified?: boolean
  metadata?: Record<string, any>
}

export interface SocialMediaPost {
  platform: SocialPlatform
  postId: string
  userId: string
  content: string
  mediaUrls?: string[]
  createdAt: Date
  updatedAt?: Date
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  viewsCount?: number
  isLiked?: boolean
  isReposted?: boolean
  isBookmarked?: boolean
  metadata?: Record<string, any>
}

export interface SocialMediaComment {
  platform: SocialPlatform
  commentId: string
  postId: string
  userId: string
  content: string
  createdAt: Date
  likesCount?: number
  repliesCount?: number
  isLiked?: boolean
  metadata?: Record<string, any>
}

export interface SocialMediaStats {
  platform: SocialPlatform
  userId: string
  followersCount: number
  followingCount: number
  postsCount: number
  engagementRate: number
  averageLikes: number
  averageComments: number
  averageShares: number
  topHashtags: string[]
  topTopics: string[]
  lastUpdated: Date
}

export interface SocialMediaAuth {
  platform: SocialPlatform
  userId: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  scope?: string[]
  metadata?: Record<string, any>
}

export type SocialPlatform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'TIKTOK'
  | 'SNAPCHAT'
  | 'YOUTUBE'
  | 'REDDIT'
  | 'PINTEREST'
  | 'TELEGRAM'
  | 'DISCORD'
  | 'MASTODON'
  | 'BLUESKY'

export interface SocialMediaProvider {
  platform: SocialPlatform
  name: string
  version: string
  baseUrl: string
  apiUrl: string
  scopes: string[]
  features: SocialMediaFeature[]
}

export type SocialMediaFeature =
  | 'AUTH'
  | 'PROFILE'
  | 'POSTS'
  | 'COMMENTS'
  | 'LIKES'
  | 'FOLLOWERS'
  | 'FOLLOWING'
  | 'SHARES'
  | 'MESSAGES'
  | 'GROUPS'
  | 'EVENTS'
  | 'LIVE'
  | 'STORIES'
  | 'REELS'
  | 'POLLS'
  | 'SPACES'
  | 'COMMUNITIES'

export interface SocialMediaError extends Error {
  platform: SocialPlatform
  code: string
  status?: number
  details?: Record<string, any>
}

export interface SocialMediaConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  apiVersion?: string
  timeout?: number
  retries?: number
  rateLimit?: {
    requests: number
    period: number
  }
} 