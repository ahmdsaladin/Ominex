import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import {
  SocialPlatform,
  SocialMediaPost,
  SocialMediaComment,
  SocialMediaProfile,
  SocialMediaError
} from './types'
import { SocialService } from './social-service'

interface CrossPlatformPost {
  content: string
  mediaUrls?: string[]
  platforms: SocialPlatform[]
  scheduledAt?: Date
  metadata?: Record<string, any>
}

interface CrossPlatformComment {
  content: string
  postId: string
  platform: SocialPlatform
  parentCommentId?: string
  metadata?: Record<string, any>
}

interface CrossPlatformReaction {
  postId: string
  platform: SocialPlatform
  type: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'
  metadata?: Record<string, any>
}

export class CrossPlatformService {
  private static instance: CrossPlatformService
  private prisma: PrismaClient
  private redis: Redis
  private socialService: SocialService
  private readonly CACHE_TTL = 3600 // 1 hour

  private constructor() {
    this.prisma = new PrismaClient()
    this.redis = new Redis(process.env.REDIS_URL)
    this.socialService = SocialService.getInstance()
  }

  static getInstance(): CrossPlatformService {
    if (!CrossPlatformService.instance) {
      CrossPlatformService.instance = new CrossPlatformService()
    }
    return CrossPlatformService.instance
  }

  async createCrossPlatformPost(
    userId: string,
    post: CrossPlatformPost
  ): Promise<SocialMediaPost[]> {
    const results: SocialMediaPost[] = []
    const errors: SocialMediaError[] = []

    // Create posts in parallel for all platforms
    await Promise.all(
      post.platforms.map(async (platform) => {
        try {
          const provider = this.socialService.getProvider(platform)
          const result = await provider.createPost({
            content: post.content,
            mediaUrls: post.mediaUrls,
            createdAt: post.scheduledAt || new Date(),
            metadata: {
              ...post.metadata,
              crossPlatform: true,
              originalPlatforms: post.platforms
            }
          })
          results.push(result)

          // Store the cross-platform relationship
          await this.prisma.crossPlatformPost.create({
            data: {
              userId,
              platform,
              postId: result.postId,
              content: post.content,
              mediaUrls: post.mediaUrls || [],
              scheduledAt: post.scheduledAt,
              metadata: post.metadata
            }
          })
        } catch (error) {
          errors.push(error as SocialMediaError)
        }
      })
    )

    if (errors.length > 0) {
      // Log errors but don't fail the entire operation
      console.error('Cross-platform post errors:', errors)
    }

    return results
  }

  async syncComments(
    userId: string,
    postId: string,
    platform: SocialPlatform
  ): Promise<SocialMediaComment[]> {
    const provider = this.socialService.getProvider(platform)
    const comments = await provider.getComments(postId)

    // Store comments in the database
    await Promise.all(
      comments.map(async (comment) => {
        await this.prisma.crossPlatformComment.upsert({
          where: {
            platform_commentId: {
              platform,
              commentId: comment.commentId
            }
          },
          update: {
            content: comment.content,
            likesCount: comment.likesCount,
            repliesCount: comment.repliesCount,
            isLiked: comment.isLiked,
            metadata: comment.metadata
          },
          create: {
            userId,
            platform,
            postId,
            commentId: comment.commentId,
            content: comment.content,
            createdAt: comment.createdAt,
            likesCount: comment.likesCount,
            repliesCount: comment.repliesCount,
            isLiked: comment.isLiked,
            metadata: comment.metadata
          }
        })
      })
    )

    return comments
  }

  async syncReactions(
    userId: string,
    postId: string,
    platform: SocialPlatform
  ): Promise<void> {
    const provider = this.socialService.getProvider(platform)
    const post = await provider.getPost(postId)

    // Store reactions in the database
    await this.prisma.crossPlatformReaction.upsert({
      where: {
        platform_postId: {
          platform,
          postId
        }
      },
      update: {
        likesCount: post.likesCount,
        isLiked: post.isLiked,
        metadata: {
          ...post.metadata,
          lastSyncedAt: new Date()
        }
      },
      create: {
        userId,
        platform,
        postId,
        likesCount: post.likesCount,
        isLiked: post.isLiked,
        metadata: {
          ...post.metadata,
          lastSyncedAt: new Date()
        }
      }
    })
  }

  async getAggregatedComments(
    userId: string,
    postId: string
  ): Promise<SocialMediaComment[]> {
    const cacheKey = `comments:${postId}`
    const cachedComments = await this.redis.get(cacheKey)
    if (cachedComments) {
      return JSON.parse(cachedComments)
    }

    // Get comments from all platforms
    const comments = await this.prisma.crossPlatformComment.findMany({
      where: {
        postId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(comments))
    return comments
  }

  async getAggregatedReactions(
    userId: string,
    postId: string
  ): Promise<{
    totalLikes: number
    platformReactions: Record<SocialPlatform, {
      likesCount: number
      isLiked: boolean
    }>
  }> {
    const cacheKey = `reactions:${postId}`
    const cachedReactions = await this.redis.get(cacheKey)
    if (cachedReactions) {
      return JSON.parse(cachedReactions)
    }

    // Get reactions from all platforms
    const reactions = await this.prisma.crossPlatformReaction.findMany({
      where: {
        postId
      }
    })

    const result = {
      totalLikes: reactions.reduce((sum, r) => sum + (r.likesCount || 0), 0),
      platformReactions: reactions.reduce((acc, r) => ({
        ...acc,
        [r.platform]: {
          likesCount: r.likesCount || 0,
          isLiked: r.isLiked
        }
      }), {} as Record<SocialPlatform, { likesCount: number; isLiked: boolean }>)
    }

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result))
    return result
  }

  async schedulePost(
    userId: string,
    post: CrossPlatformPost
  ): Promise<void> {
    if (!post.scheduledAt) {
      throw new Error('Scheduled time is required')
    }

    // Store the scheduled post
    await this.prisma.scheduledPost.create({
      data: {
        userId,
        content: post.content,
        mediaUrls: post.mediaUrls || [],
        platforms: post.platforms,
        scheduledAt: post.scheduledAt,
        metadata: post.metadata
      }
    })

    // Schedule the post creation
    // This is a placeholder - implement actual scheduling logic
    setTimeout(async () => {
      await this.createCrossPlatformPost(userId, post)
    }, post.scheduledAt.getTime() - Date.now())
  }

  async getScheduledPosts(userId: string): Promise<CrossPlatformPost[]> {
    return this.prisma.scheduledPost.findMany({
      where: {
        userId,
        scheduledAt: {
          gt: new Date()
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    })
  }

  async cancelScheduledPost(userId: string, postId: string): Promise<void> {
    await this.prisma.scheduledPost.delete({
      where: {
        id: postId
      }
    })
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect()
    await this.redis.quit()
  }
} 