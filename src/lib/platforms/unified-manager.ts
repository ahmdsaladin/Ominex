import { Platform, ContentType } from '@prisma/client'
import { prisma } from '../db'
import { ai } from '../ai'
import { s3 } from '../s3'
import { getWebSocketService } from '../websocket'
import { BasePlatform, PlatformPost, PlatformAnalytics } from './index'

export interface UnifiedPost {
  content: string
  media?: Array<{
    type: 'image' | 'video' | 'audio'
    url: string
    caption?: string
  }>
  platforms: Platform[]
  scheduledFor?: Date
  metadata?: Record<string, any>
}

export interface UnifiedMessage {
  content: string
  media?: Array<{
    type: 'image' | 'video' | 'audio'
    url: string
  }>
  senderId: string
  receiverId: string
  platform: Platform
  metadata?: Record<string, any>
}

export class UnifiedPlatformManager {
  private platforms: Map<Platform, BasePlatform>
  private ws: any

  constructor() {
    this.platforms = new Map()
    this.ws = getWebSocketService()
  }

  async initialize(): Promise<void> {
    // Initialize platform instances
    for (const platform of Object.values(Platform)) {
      const instance = await this.getPlatformInstance(platform)
      this.platforms.set(platform, instance)
    }

    // Start real-time sync
    this.startRealTimeSync()
  }

  private async getPlatformInstance(platform: Platform): Promise<BasePlatform> {
    const { getPlatformInstance } = await import('./index')
    return getPlatformInstance(platform)
  }

  private startRealTimeSync(): void {
    // Set up interval for real-time data sync
    setInterval(async () => {
      await this.syncPlatformData()
    }, 60000) // Sync every minute
  }

  private async syncPlatformData(): Promise<void> {
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
      },
    })

    for (const user of users) {
      for (const account of user.accounts) {
        try {
          const platform = this.platforms.get(account.platform)
          if (!platform) continue

          // Sync posts
          await this.syncPosts(user.id, account.platform, platform)
          
          // Sync messages
          await this.syncMessages(user.id, account.platform, platform)
          
          // Sync analytics
          await this.syncAnalytics(user.id, account.platform, platform)
          
          // Update platform status
          await this.updatePlatformStatus(user.id, account.platform, platform)
        } catch (error) {
          console.error(`Error syncing ${account.platform} for user ${user.id}:`, error)
        }
      }
    }
  }

  private async syncPosts(userId: string, platform: Platform, instance: BasePlatform): Promise<void> {
    const posts = await prisma.post.findMany({
      where: {
        userId,
        platform,
        isPublished: true,
      },
    })

    for (const post of posts) {
      const analytics = await instance.getAnalytics(post.platformPostId || '')
      await prisma.analytics.create({
        data: {
          postId: post.id,
          platform,
          ...analytics,
        },
      })

      // Notify through WebSocket
      this.ws.emitToUser(userId, 'post_analytics_updated', {
        postId: post.id,
        platform,
        analytics,
      })
    }
  }

  private async syncMessages(userId: string, platform: Platform, instance: BasePlatform): Promise<void> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        platform,
      },
    })

    for (const message of messages) {
      // Update message status if needed
      if (!message.isRead && message.receiverId === userId) {
        await prisma.message.update({
          where: { id: message.id },
          data: { isRead: true },
        })

        // Notify through WebSocket
        this.ws.emitToUser(userId, 'message_read', {
          messageId: message.id,
          platform,
        })
      }
    }
  }

  private async syncAnalytics(userId: string, platform: Platform, instance: BasePlatform): Promise<void> {
    const profile = await instance.getProfile()
    const followers = await instance.getFollowers()
    const following = await instance.getFollowing()

    // Update account stats
    await prisma.account.update({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      data: {
        platformUsername: profile.username,
        platformAvatar: profile.avatar,
        metadata: {
          followers,
          following,
          bio: profile.bio,
        },
      },
    })

    // Notify through WebSocket
    this.ws.emitToUser(userId, 'profile_updated', {
      platform,
      profile,
      followers,
      following,
    })
  }

  private async updatePlatformStatus(userId: string, platform: Platform, instance: BasePlatform): Promise<void> {
    try {
      await instance.getProfile() // Test connection
      await prisma.account.update({
        where: {
          userId_platform: {
            userId,
            platform,
          },
        },
        data: {
          status: 'active',
          lastStatusUpdate: new Date(),
        },
      })
    } catch (error) {
      await prisma.account.update({
        where: {
          userId_platform: {
            userId,
            platform,
          },
        },
        data: {
          status: 'error',
          lastStatusUpdate: new Date(),
        },
      })
    }
  }

  async createUnifiedPost(post: UnifiedPost, userId: string): Promise<string[]> {
    const postIds: string[] = []
    const aiOptimizedContent = await this.optimizeContentForPlatforms(post.content, post.platforms)

    for (const platform of post.platforms) {
      const instance = this.platforms.get(platform)
      if (!instance) continue

      const platformPost: PlatformPost = {
        content: aiOptimizedContent[platform],
        media: post.media,
        scheduledFor: post.scheduledFor,
        metadata: post.metadata,
      }

      const platformPostId = await instance.createPost(platformPost)
      
      const dbPost = await prisma.post.create({
        data: {
          userId,
          platform,
          platformPostId,
          type: ContentType.POST,
          content: platformPost.content,
          media: platformPost.media,
          metadata: platformPost.metadata,
          isPublished: !platformPost.scheduledFor,
          isScheduled: !!platformPost.scheduledFor,
          scheduledFor: platformPost.scheduledFor,
          publishedAt: !platformPost.scheduledFor ? new Date() : undefined,
        },
      })

      postIds.push(dbPost.id)
    }

    return postIds
  }

  async sendUnifiedMessage(message: UnifiedMessage): Promise<string> {
    const instance = this.platforms.get(message.platform)
    if (!instance) {
      throw new Error(`Platform ${message.platform} not supported`)
    }

    // Store message in database
    const dbMessage = await prisma.message.create({
      data: {
        senderId: message.senderId,
        receiverId: message.receiverId,
        platform: message.platform,
        content: message.content,
        media: message.media,
        isRead: false,
      },
    })

    // Send through WebSocket if receiver is online
    this.ws.emitToUser(message.receiverId, 'new_message', {
      messageId: dbMessage.id,
      senderId: message.senderId,
      content: message.content,
      platform: message.platform,
      timestamp: new Date(),
    })

    return dbMessage.id
  }

  private async optimizeContentForPlatforms(content: string, platforms: Platform[]): Promise<Record<Platform, string>> {
    const optimizedContent: Record<Platform, string> = {} as Record<Platform, string>

    for (const platform of platforms) {
      const suggestion = await ai.generateContentSuggestion(
        platform,
        [], // Target audience will be determined by platform
        [] // Topics will be extracted from content
      )

      optimizedContent[platform] = suggestion.content
    }

    return optimizedContent
  }

  async getUnifiedAnalytics(userId: string, platform: Platform): Promise<PlatformAnalytics> {
    const instance = this.platforms.get(platform)
    if (!instance) {
      throw new Error(`Platform ${platform} not supported`)
    }

    const posts = await prisma.post.findMany({
      where: {
        userId,
        platform,
        isPublished: true,
      },
    })

    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    for (const post of posts) {
      const analytics = await instance.getAnalytics(post.platformPostId || '')
      totalViews += analytics.views
      totalLikes += analytics.likes
      totalComments += analytics.comments
      totalShares += analytics.shares
    }

    return {
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      engagement: (totalLikes + totalComments + totalShares) / (totalViews || 1),
      date: new Date(),
    }
  }
}

let unifiedManager: UnifiedPlatformManager | null = null

export function getUnifiedManager(): UnifiedPlatformManager {
  if (!unifiedManager) {
    unifiedManager = new UnifiedPlatformManager()
  }
  return unifiedManager
} 