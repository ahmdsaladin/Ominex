import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

interface TrainingData {
  contentFeatures: number[]
  userFeatures: number[]
  contextFeatures: number[]
  engagement: number
}

interface InteractionMetrics {
  likes: number
  comments: number
  shares: number
  timeSpent: number
}

export class TrainingDataCollector {
  private static instance: TrainingDataCollector
  private prisma: PrismaClient
  private redis: Redis
  private readonly BATCH_SIZE = 1000
  private readonly CACHE_TTL = 3600 // 1 hour

  private constructor() {
    this.prisma = new PrismaClient()
    this.redis = new Redis(process.env.REDIS_URL)
  }

  static getInstance(): TrainingDataCollector {
    if (!TrainingDataCollector.instance) {
      TrainingDataCollector.instance = new TrainingDataCollector()
    }
    return TrainingDataCollector.instance
  }

  async collectInteractionData(
    userId: string,
    contentId: string,
    interactionType: string,
    context: any
  ): Promise<void> {
    // Store interaction data in Redis for real-time processing
    const interactionKey = `interaction:${userId}:${contentId}`
    const interactionData = {
      type: interactionType,
      timestamp: Date.now(),
      context
    }

    await this.redis.setex(
      interactionKey,
      this.CACHE_TTL,
      JSON.stringify(interactionData)
    )

    // Trigger batch processing if needed
    await this.processBatchIfNeeded()
  }

  async collectEngagementMetrics(
    userId: string,
    contentId: string,
    metrics: InteractionMetrics
  ): Promise<void> {
    // Store engagement metrics
    const metricsKey = `metrics:${userId}:${contentId}`
    await this.redis.setex(
      metricsKey,
      this.CACHE_TTL,
      JSON.stringify(metrics)
    )

    // Generate training data
    const trainingData = await this.generateTrainingData(
      userId,
      contentId,
      metrics
    )

    // Store training data
    await this.storeTrainingData(trainingData)
  }

  private async processBatchIfNeeded(): Promise<void> {
    const batchKey = 'training:batch:current'
    const batchSize = await this.redis.llen(batchKey)

    if (batchSize >= this.BATCH_SIZE) {
      await this.processBatch()
    }
  }

  private async processBatch(): Promise<void> {
    const batchKey = 'training:batch:current'
    const batchData = await this.redis.lrange(batchKey, 0, this.BATCH_SIZE - 1)

    if (batchData.length === 0) {
      return
    }

    // Process batch data
    const processedData = await Promise.all(
      batchData.map(data => this.processTrainingData(JSON.parse(data)))
    )

    // Store processed data
    await this.storeProcessedData(processedData)

    // Remove processed data from batch
    await this.redis.ltrim(batchKey, this.BATCH_SIZE, -1)
  }

  private async generateTrainingData(
    userId: string,
    contentId: string,
    metrics: InteractionMetrics
  ): Promise<TrainingData> {
    const [content, user, interactions] = await Promise.all([
      this.getContentFeatures(contentId),
      this.getUserFeatures(userId),
      this.getInteractionFeatures(contentId, userId)
    ])

    const context = await this.getContextFeatures(userId, contentId)

    // Calculate engagement score
    const engagement = this.calculateEngagementScore(metrics)

    return {
      contentFeatures: this.normalizeFeatures(content),
      userFeatures: this.normalizeFeatures(user),
      contextFeatures: this.normalizeFeatures(context),
      engagement
    }
  }

  private async getContentFeatures(contentId: string): Promise<number[]> {
    const content = await this.prisma.post.findUnique({
      where: { id: contentId },
      include: {
        likes: true,
        comments: true,
        author: true,
        tags: true
      }
    })

    if (!content) {
      throw new Error(`Content not found: ${contentId}`)
    }

    return [
      content.likes.length,
      content.comments.length,
      content.author.followersCount,
      content.author.postsCount,
      content.author.engagementRate,
      content.tags.length,
      content.mediaUrls.length,
      content.wordCount,
      // Add more content features as needed
    ]
  }

  private async getUserFeatures(userId: string): Promise<number[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        achievements: true,
        settings: true,
        followers: true,
        following: true
      }
    })

    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    return [
      user.interests.length,
      user.achievements.length,
      user.settings.engagementLevel,
      user.settings.notificationPreferences.length,
      user.followers.length,
      user.following.length,
      user.postsCount,
      user.engagementRate,
      // Add more user features as needed
    ]
  }

  private async getInteractionFeatures(
    contentId: string,
    userId: string
  ): Promise<number[]> {
    const interactions = await this.prisma.interaction.findMany({
      where: {
        contentId,
        userId
      },
      include: {
        content: true
      }
    })

    return [
      interactions.length,
      interactions.filter(i => i.type === 'LIKE').length,
      interactions.filter(i => i.type === 'COMMENT').length,
      interactions.filter(i => i.type === 'SHARE').length,
      interactions.filter(i => i.type === 'VIEW').length,
      // Add more interaction features as needed
    ]
  }

  private async getContextFeatures(
    userId: string,
    contentId: string
  ): Promise<number[]> {
    const interaction = await this.prisma.interaction.findFirst({
      where: {
        userId,
        contentId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!interaction) {
      return [0, 0, 0, 0, 0] // Default context features
    }

    const hour = new Date(interaction.createdAt).getHours()
    const dayOfWeek = new Date(interaction.createdAt).getDay()
    const deviceType = this.getDeviceType(interaction.userAgent)
    const location = await this.getLocationFeatures(userId)
    const timeSinceLastInteraction = this.calculateTimeSinceLastInteraction(
      userId,
      contentId
    )

    return [
      hour,
      dayOfWeek,
      deviceType,
      location,
      timeSinceLastInteraction
    ]
  }

  private getDeviceType(userAgent: string): number {
    // Implement device type detection
    if (userAgent.includes('Mobile')) return 1
    if (userAgent.includes('Tablet')) return 2
    return 0 // Desktop
  }

  private async getLocationFeatures(userId: string): Promise<number> {
    // Implement location feature extraction
    return 0 // Placeholder
  }

  private async calculateTimeSinceLastInteraction(
    userId: string,
    contentId: string
  ): Promise<number> {
    const lastInteraction = await this.prisma.interaction.findFirst({
      where: {
        userId,
        NOT: { contentId }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!lastInteraction) {
      return 0
    }

    const now = new Date()
    const lastInteractionTime = new Date(lastInteraction.createdAt)
    return (now.getTime() - lastInteractionTime.getTime()) / (1000 * 60 * 60) // Hours
  }

  private calculateEngagementScore(metrics: InteractionMetrics): number {
    const weights = {
      likes: 0.3,
      comments: 0.4,
      shares: 0.2,
      timeSpent: 0.1
    }

    return (
      (metrics.likes * weights.likes +
        metrics.comments * weights.comments +
        metrics.shares * weights.shares +
        metrics.timeSpent * weights.timeSpent) /
      100
    )
  }

  private normalizeFeatures(features: number[]): number[] {
    const max = Math.max(...features)
    const min = Math.min(...features)
    return features.map(f => (f - min) / (max - min))
  }

  private async processTrainingData(data: TrainingData): Promise<TrainingData> {
    // Apply any necessary data processing or cleaning
    return {
      contentFeatures: this.cleanFeatures(data.contentFeatures),
      userFeatures: this.cleanFeatures(data.userFeatures),
      contextFeatures: this.cleanFeatures(data.contextFeatures),
      engagement: data.engagement
    }
  }

  private cleanFeatures(features: number[]): number[] {
    // Remove outliers
    const cleaned = this.removeOutliers(features)
    // Fill missing values
    return this.fillMissingValues(cleaned)
  }

  private removeOutliers(features: number[]): number[] {
    const mean = features.reduce((a, b) => a + b, 0) / features.length
    const stdDev = Math.sqrt(
      features.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / features.length
    )

    return features.filter(f => Math.abs(f - mean) <= 3 * stdDev)
  }

  private fillMissingValues(features: number[]): number[] {
    const mean = features.reduce((a, b) => a + b, 0) / features.length
    return features.map(f => (isNaN(f) ? mean : f))
  }

  private async storeTrainingData(data: TrainingData): Promise<void> {
    const batchKey = 'training:batch:current'
    await this.redis.rpush(batchKey, JSON.stringify(data))
  }

  private async storeProcessedData(data: TrainingData[]): Promise<void> {
    const processedKey = 'training:processed'
    await this.redis.rpush(
      processedKey,
      ...data.map(d => JSON.stringify(d))
    )
  }

  async getProcessedData(limit: number = 1000): Promise<TrainingData[]> {
    const processedKey = 'training:processed'
    const data = await this.redis.lrange(processedKey, 0, limit - 1)
    return data.map(d => JSON.parse(d))
  }

  async clearProcessedData(): Promise<void> {
    const processedKey = 'training:processed'
    await this.redis.del(processedKey)
  }
} 