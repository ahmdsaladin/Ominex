import { Platform, ContentType } from '@prisma/client'
import { prisma } from '../db'
import { ai } from '../ai'
import { getUnifiedManager } from '../platforms/unified-manager'

export interface ContentPreference {
  topics: string[]
  platforms: Platform[]
  contentTypes: ContentType[]
  engagementWeight: number
  timeWeight: number
}

export interface FeedItem {
  id: string
  platform: Platform
  type: ContentType
  content: string
  media?: Array<{
    type: 'image' | 'video' | 'audio'
    url: string
    caption?: string
  }>
  metadata: Record<string, any>
  analytics: {
    views: number
    likes: number
    comments: number
    shares: number
    engagement: number
  }
  author: {
    id: string
    name: string
    avatar: string
    platformUsername: string
  }
  timestamp: Date
  relevanceScore: number
}

export class ContentCurator {
  private unifiedManager: any
  private userPreferences: Map<string, ContentPreference>
  private trendingTopics: Map<string, number>
  private lastUpdate: Date

  constructor() {
    this.unifiedManager = getUnifiedManager()
    this.userPreferences = new Map()
    this.trendingTopics = new Map()
    this.lastUpdate = new Date()
  }

  async initialize(): Promise<void> {
    // Start periodic updates
    setInterval(async () => {
      await this.updateTrendingTopics()
      await this.updateUserPreferences()
    }, 3600000) // Update every hour
  }

  private async updateTrendingTopics(): Promise<void> {
    const posts = await prisma.post.findMany({
      where: {
        isPublished: true,
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        analytics: true,
      },
    })

    // Analyze content and extract topics
    for (const post of posts) {
      const analysis = await ai.analyzeContent(post.content)
      const topics = analysis.topics

      // Update topic scores based on engagement
      topics.forEach((topic) => {
        const currentScore = this.trendingTopics.get(topic) || 0
        const engagement = post.analytics.reduce((acc, curr) => {
          return acc + curr.likes + curr.comments + curr.shares
        }, 0)

        this.trendingTopics.set(topic, currentScore + engagement)
      })
    }

    // Normalize scores
    const maxScore = Math.max(...Array.from(this.trendingTopics.values()))
    for (const [topic, score] of this.trendingTopics.entries()) {
      this.trendingTopics.set(topic, score / maxScore)
    }

    this.lastUpdate = new Date()
  }

  private async updateUserPreferences(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          include: {
            analytics: true,
          },
        },
        likes: true,
        comments: true,
        shares: true,
      },
    })

    if (!user) return

    // Analyze user's engagement patterns
    const topics = new Map<string, number>()
    const platforms = new Map<Platform, number>()
    const contentTypes = new Map<ContentType, number>()

    // Analyze posts
    for (const post of user.posts) {
      const analysis = await ai.analyzeContent(post.content)
      analysis.topics.forEach((topic) => {
        topics.set(topic, (topics.get(topic) || 0) + 1)
      })
      platforms.set(post.platform, (platforms.get(post.platform) || 0) + 1)
      contentTypes.set(post.type, (contentTypes.get(post.type) || 0) + 1)
    }

    // Analyze engagement
    for (const like of user.likes) {
      const post = await prisma.post.findUnique({
        where: { id: like.postId },
      })
      if (post) {
        const analysis = await ai.analyzeContent(post.content)
        analysis.topics.forEach((topic) => {
          topics.set(topic, (topics.get(topic) || 0) + 2)
        })
        platforms.set(post.platform, (platforms.get(post.platform) || 0) + 2)
        contentTypes.set(post.type, (contentTypes.get(post.type) || 0) + 2)
      }
    }

    // Normalize and update preferences
    const preferences: ContentPreference = {
      topics: Array.from(topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic]) => topic),
      platforms: Array.from(platforms.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([platform]) => platform),
      contentTypes: Array.from(contentTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type),
      engagementWeight: 0.7,
      timeWeight: 0.3,
    }

    this.userPreferences.set(userId, preferences)
  }

  async getPersonalizedFeed(
    userId: string,
    filters?: {
      platforms?: Platform[]
      contentTypes?: ContentType[]
      topics?: string[]
      timeRange?: 'day' | 'week' | 'month' | 'year'
    }
  ): Promise<FeedItem[]> {
    const preferences = this.userPreferences.get(userId)
    if (!preferences) {
      await this.updateUserPreferences(userId)
    }

    // Get posts based on filters
    const posts = await prisma.post.findMany({
      where: {
        isPublished: true,
        publishedAt: {
          gte: this.getTimeRangeFilter(filters?.timeRange),
        },
        ...(filters?.platforms && { platform: { in: filters.platforms } }),
        ...(filters?.contentTypes && { type: { in: filters.contentTypes } }),
      },
      include: {
        user: true,
        analytics: true,
      },
    })

    // Score and rank posts
    const feedItems: FeedItem[] = await Promise.all(
      posts.map(async (post) => {
        const relevanceScore = await this.calculateRelevanceScore(
          post,
          preferences,
          filters
        )

        return {
          id: post.id,
          platform: post.platform,
          type: post.type,
          content: post.content,
          media: post.media,
          metadata: post.metadata,
          analytics: {
            views: post.analytics.reduce((acc, curr) => acc + curr.views, 0),
            likes: post.analytics.reduce((acc, curr) => acc + curr.likes, 0),
            comments: post.analytics.reduce((acc, curr) => acc + curr.comments, 0),
            shares: post.analytics.reduce((acc, curr) => acc + curr.shares, 0),
            engagement: post.analytics.reduce((acc, curr) => acc + curr.engagement, 0),
          },
          author: {
            id: post.user.id,
            name: post.user.name,
            avatar: post.user.avatar,
            platformUsername: post.user.accounts.find(
              (acc) => acc.platform === post.platform
            )?.platformUsername || '',
          },
          timestamp: post.publishedAt,
          relevanceScore,
        }
      })
    )

    // Sort by relevance score
    return feedItems.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private async calculateRelevanceScore(
    post: any,
    preferences: ContentPreference,
    filters?: any
  ): Promise<number> {
    const analysis = await ai.analyzeContent(post.content)
    let score = 0

    // Topic relevance
    const topicOverlap = analysis.topics.filter((topic) =>
      preferences.topics.includes(topic)
    ).length
    score += (topicOverlap / preferences.topics.length) * 0.3

    // Platform preference
    if (preferences.platforms.includes(post.platform)) {
      score += 0.2
    }

    // Content type preference
    if (preferences.contentTypes.includes(post.type)) {
      score += 0.2
    }

    // Engagement score
    const engagement = post.analytics.reduce((acc: number, curr: any) => {
      return acc + curr.likes + curr.comments + curr.shares
    }, 0)
    score += (engagement / 1000) * preferences.engagementWeight

    // Time decay
    const timeDiff = Date.now() - post.publishedAt.getTime()
    const timeScore = Math.exp(-timeDiff / (7 * 24 * 60 * 60 * 1000)) // 7-day decay
    score += timeScore * preferences.timeWeight

    // Trending topics bonus
    const trendingBonus = analysis.topics.reduce((acc, topic) => {
      return acc + (this.trendingTopics.get(topic) || 0)
    }, 0)
    score += (trendingBonus / analysis.topics.length) * 0.1

    return score
  }

  private getTimeRangeFilter(timeRange?: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date()
    switch (timeRange) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1))
      case 'week':
        return new Date(now.setDate(now.getDate() - 7))
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1))
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1))
      default:
        return new Date(now.setDate(now.getDate() - 7)) // Default to last week
    }
  }

  getTrendingTopics(): Array<{ topic: string; score: number }> {
    return Array.from(this.trendingTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, score]) => ({ topic, score }))
  }

  getUserPreferences(userId: string): ContentPreference | undefined {
    return this.userPreferences.get(userId)
  }
}

let contentCurator: ContentCurator | null = null

export function getContentCurator(): ContentCurator {
  if (!contentCurator) {
    contentCurator = new ContentCurator()
  }
  return contentCurator
} 