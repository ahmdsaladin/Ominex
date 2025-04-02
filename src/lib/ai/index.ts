import { Post, Story, User } from '../../types'
import { prisma } from '../prisma'
import { realtime } from '../realtime'
import { env } from '../env'

interface EngagementPatterns {
  storyEngagement: number
  postEngagement: number
  timeSpent: number
  interactionTypes: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  preferredContentTypes: string[]
  activeHours: number[]
}

interface ContentRecommendations {
  posts: Post[]
  stories: Story[]
}

interface UserPreferences {
  interests: string[]
  contentTypes: ContentType[]
  engagementPatterns: {
    [key: string]: number // Content type to engagement score
  }
}

interface ContentScore {
  score: number
  reasons: string[]
}

export class AIService {
  private static instance: AIService
  private modelEndpoint: string
  private apiKey: string

  private constructor() {
    this.modelEndpoint = env.AI_MODEL_ENDPOINT
    this.apiKey = env.AI_API_KEY
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async analyzeUserEngagement(userId: string): Promise<EngagementPatterns> {
    try {
      // Get user interactions from the database
      const interactions = await prisma.userInteraction.findMany({
        where: { userId },
        include: {
          post: true,
          story: true,
        },
      })

      // Calculate engagement metrics
      const metrics = this.calculateEngagementMetrics(interactions)

      // Analyze preferred content types
      const contentTypes = this.analyzeContentTypes(interactions)

      // Determine active hours
      const activeHours = this.determineActiveHours(interactions)

      return {
        storyEngagement: metrics.storyEngagement,
        postEngagement: metrics.postEngagement,
        timeSpent: metrics.timeSpent,
        interactionTypes: metrics.interactionTypes,
        preferredContentTypes: contentTypes,
        activeHours,
      }
    } catch (error) {
      console.error('Error analyzing user engagement:', error)
      throw error
    }
  }

  async getContentRecommendations({
    userId,
    posts,
    stories,
    engagementPatterns,
  }: {
    userId: string
    posts: Post[]
    stories: Story[]
    engagementPatterns: EngagementPatterns
  }): Promise<ContentRecommendations> {
    try {
      // Get user's network and preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          network: {
            include: {
              followers: true,
              following: true,
            },
          },
        },
      })

      if (!user) throw new Error('User not found')

      // Score content based on engagement patterns
      const scoredPosts = this.scorePosts(posts, engagementPatterns, user)
      const scoredStories = this.scoreStories(stories, engagementPatterns, user)

      // Sort content by score
      const sortedPosts = scoredPosts.sort((a, b) => b.score - a.score)
      const sortedStories = scoredStories.sort((a, b) => b.score - a.score)

      return {
        posts: sortedPosts.map(p => p.post),
        stories: sortedStories.map(s => s.story),
      }
    } catch (error) {
      console.error('Error getting content recommendations:', error)
      throw error
    }
  }

  async updateUserPreferences(
    userId: string,
    interaction: {
      type: 'view' | 'like' | 'comment' | 'share'
      contentId: string
      contentType: ContentType
    }
  ): Promise<void> {
    try {
      // Get current preferences
      const preferences = await this.getUserPreferences(userId)

      // Update engagement patterns
      preferences.engagementPatterns[interaction.contentType] =
        (preferences.engagementPatterns[interaction.contentType] || 0) +
        this.getInteractionWeight(interaction.type)

      // Update interests based on content
      const content = await this.getContentDetails(
        interaction.contentId,
        interaction.contentType
      )
      if (content) {
        const newInterests = await this.extractInterests(content)
        preferences.interests = [
          ...new Set([...preferences.interests, ...newInterests]),
        ]
      }

      // Save updated preferences
      await this.saveUserPreferences(userId, preferences)

      // Emit real-time update
      realtime.emit('preferences:updated', {
        userId,
        preferences,
      })
    } catch (error) {
      console.error('Preference update error:', error)
      throw error
    }
  }

  // Content Recommendation
  async getPersonalizedFeed(
    userId: string,
    limit: number = 20
  ): Promise<Post[]> {
    try {
      // Get user preferences and behavior
      const userPreferences = await this.getUserPreferences(userId)

      // Get content candidates
      const candidates = await prisma.post.findMany({
        where: {
          NOT: {
            authorId: userId,
          },
        },
        include: {
          author: true,
          likes: true,
          comments: true,
        },
        take: 100, // Get more candidates for better filtering
      })

      // Score and rank content
      const scoredContent = await Promise.all(
        candidates.map(async (post) => {
          const score = await this.scoreContent(post, userPreferences)
          return { post, score }
        })
      )

      // Sort by score and take top N
      const rankedContent = scoredContent
        .sort((a, b) => b.score.score - a.score.score)
        .slice(0, limit)
        .map((item) => item.post)

      return rankedContent
    } catch (error) {
      console.error('Content recommendation error:', error)
      throw error
    }
  }

  // Spam Detection
  async detectSpam(
    content: string,
    contentType: 'post' | 'comment'
  ): Promise<{ isSpam: boolean; confidence: number; reasons: string[] }> {
    try {
      const response = await fetch(`${this.modelEndpoint}/spam-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          content,
          contentType,
        }),
      })

      if (!response.ok) {
        throw new Error('Spam detection failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Spam detection error:', error)
      throw error
    }
  }

  // Content Moderation
  async moderateContent(
    content: string,
    contentType: 'post' | 'comment' | 'profile'
  ): Promise<{
    isAppropriate: boolean
    confidence: number
    flags: string[]
    suggestedActions: string[]
  }> {
    try {
      const response = await fetch(`${this.modelEndpoint}/content-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          content,
          contentType,
        }),
      })

      if (!response.ok) {
        throw new Error('Content moderation failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Content moderation error:', error)
      throw error
    }
  }

  // Fake News Detection
  async detectFakeNews(
    content: string,
    source?: string
  ): Promise<{
    isFake: boolean
    confidence: number
    reasons: string[]
    factChecks: string[]
  }> {
    try {
      const response = await fetch(`${this.modelEndpoint}/fake-news-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          content,
          source,
        }),
      })

      if (!response.ok) {
        throw new Error('Fake news detection failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Fake news detection error:', error)
      throw error
    }
  }

  private calculateEngagementMetrics(interactions: any[]) {
    let storyEngagement = 0
    let postEngagement = 0
    let timeSpent = 0
    const interactionTypes = {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    }

    interactions.forEach(interaction => {
      if (interaction.story) {
        storyEngagement += this.calculateStoryEngagement(interaction)
      } else if (interaction.post) {
        postEngagement += this.calculatePostEngagement(interaction)
      }

      timeSpent += interaction.duration || 0

      // Count interaction types
      switch (interaction.type) {
        case 'LIKE':
          interactionTypes.likes++
          break
        case 'COMMENT':
          interactionTypes.comments++
          break
        case 'SHARE':
          interactionTypes.shares++
          break
        case 'VIEW':
          interactionTypes.views++
          break
      }
    })

    return {
      storyEngagement,
      postEngagement,
      timeSpent,
      interactionTypes,
    }
  }

  private calculateStoryEngagement(interaction: any): number {
    const weights = {
      VIEW: 1,
      LIKE: 2,
      SHARE: 3,
      COMMENT: 4,
    }

    return weights[interaction.type] || 0
  }

  private calculatePostEngagement(interaction: any): number {
    const weights = {
      VIEW: 1,
      LIKE: 2,
      SHARE: 3,
      COMMENT: 4,
    }

    return weights[interaction.type] || 0
  }

  private analyzeContentTypes(interactions: any[]): string[] {
    const typeCounts = new Map<string, number>()

    interactions.forEach(interaction => {
      const type = interaction.post?.type || interaction.story?.type
      if (type) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
      }
    })

    return Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
  }

  private determineActiveHours(interactions: any[]): number[] {
    const hourCounts = new Array(24).fill(0)

    interactions.forEach(interaction => {
      const hour = new Date(interaction.timestamp).getHours()
      hourCounts[hour]++
    })

    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .map(({ hour }) => hour)
  }

  private scorePosts(
    posts: Post[],
    engagementPatterns: EngagementPatterns,
    user: User
  ): { post: Post; score: number }[] {
    return posts.map(post => {
      let score = 0

      // Content type preference
      if (engagementPatterns.preferredContentTypes.includes(post.type)) {
        score += 2
      }

      // Network relevance
      if (user.network.following.some(f => f.id === post.authorId)) {
        score += 3
      }

      // Time relevance
      const postHour = new Date(post.createdAt).getHours()
      if (engagementPatterns.activeHours.includes(postHour)) {
        score += 1
      }

      // Engagement potential
      if (post.media?.length > 0) {
        score += 1
      }

      return { post, score }
    })
  }

  private scoreStories(
    stories: Story[],
    engagementPatterns: EngagementPatterns,
    user: User
  ): { story: Story; score: number }[] {
    return stories.map(story => {
      let score = 0

      // Content type preference
      if (engagementPatterns.preferredContentTypes.includes(story.type)) {
        score += 2
      }

      // Network relevance
      if (user.network.following.some(f => f.id === story.authorId)) {
        score += 3
      }

      // Time relevance
      const storyHour = new Date(story.createdAt).getHours()
      if (engagementPatterns.activeHours.includes(storyHour)) {
        score += 1
      }

      // Engagement potential
      if (story.media?.length > 0) {
        score += 1
      }

      return { story, score }
    })
  }

  // Helper Methods
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    })

    if (!user?.preferences) {
      return {
        interests: [],
        contentTypes: [],
        engagementPatterns: {},
      }
    }

    return {
      interests: user.preferences.interests || [],
      contentTypes: user.preferences.contentTypes || [],
      engagementPatterns: user.preferences.engagementPatterns || {},
    }
  }

  private async saveUserPreferences(
    userId: string,
    preferences: UserPreferences
  ): Promise<void> {
    await prisma.userPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    })
  }

  private async scoreContent(
    post: Post,
    preferences: UserPreferences
  ): Promise<ContentScore> {
    const reasons: string[] = []
    let score = 0

    // Content type match
    if (preferences.contentTypes.includes(post.type)) {
      score += 0.3
      reasons.push('Matching content type')
    }

    // Interest match
    const postInterests = await this.extractInterests(post)
    const interestMatch = postInterests.filter((interest) =>
      preferences.interests.includes(interest)
    ).length
    score += (interestMatch / postInterests.length) * 0.3
    reasons.push(`Matching interests: ${interestMatch}`)

    // Engagement score
    const engagementScore = this.calculateEngagementScore(post)
    score += engagementScore * 0.4
    reasons.push(`Engagement score: ${engagementScore}`)

    return { score, reasons }
  }

  private calculateEngagementScore(post: Post): number {
    const likes = post.likes.length
    const comments = post.comments.length
    const views = post.views || 0

    return (
      (likes * 0.4 + comments * 0.4 + views * 0.2) /
      (likes + comments + views + 1)
    )
  }

  private getInteractionWeight(type: string): number {
    const weights: { [key: string]: number } = {
      view: 1,
      like: 2,
      comment: 3,
      share: 4,
    }
    return weights[type] || 1
  }

  private async extractInterests(content: any): Promise<string[]> {
    // Implement interest extraction logic
    // This is a placeholder for the actual implementation
    return []
  }

  private async getContentDetails(
    contentId: string,
    contentType: ContentType
  ): Promise<any> {
    // Implement content retrieval logic
    // This is a placeholder for the actual implementation
    return null
  }
}

export const ai = AIService.getInstance() 