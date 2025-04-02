import OpenAI from 'openai'
import { env } from './env'
import { Post, Story, User } from '../types'
import { prisma } from './prisma'

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral'
  topics: string[]
  keywords: string[]
  language: string
  toxicity: number
}

export interface ContentSuggestion {
  title: string
  content: string
  hashtags: string[]
  bestTimeToPost: Date
  targetAudience: string[]
}

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

export class AIService {
  private client: OpenAI
  private static instance: AIService

  constructor() {
    this.client = openai
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a content analysis expert. Analyze the following content and provide insights about sentiment, topics, keywords, language, and toxicity level.',
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')
    return {
      sentiment: analysis.sentiment,
      topics: analysis.topics,
      keywords: analysis.keywords,
      language: analysis.language,
      toxicity: analysis.toxicity,
    }
  }

  async generateContentSuggestion(
    platform: string,
    targetAudience: string[],
    topics: string[]
  ): Promise<ContentSuggestion> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a social media content expert for ${platform}. Generate engaging content suggestions based on the target audience and topics provided.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            targetAudience,
            topics,
          }),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const suggestion = JSON.parse(response.choices[0].message.content || '{}')
    return {
      title: suggestion.title,
      content: suggestion.content,
      hashtags: suggestion.hashtags,
      bestTimeToPost: new Date(suggestion.bestTimeToPost),
      targetAudience: suggestion.targetAudience,
    }
  }

  async optimizeHashtags(content: string, platform: string): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a hashtag optimization expert for ${platform}. Generate relevant and trending hashtags for the given content.`,
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    })

    return JSON.parse(response.choices[0].message.content || '[]')
  }

  async generateImagePrompt(content: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating detailed image generation prompts. Create a prompt that will generate an engaging image based on the given content.',
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    return response.choices[0].message.content || ''
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    return response.data[0].url || ''
  }

  async analyzeAudienceEngagement(
    content: string,
    metrics: {
      likes: number
      comments: number
      shares: number
      views: number
    }
  ): Promise<{
    engagementRate: number
    audienceReaction: string
    improvementSuggestions: string[]
  }> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an audience engagement analysis expert. Analyze the content and metrics to provide insights and improvement suggestions.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            content,
            metrics,
          }),
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  }

  async generateContentCalendar(
    topics: string[],
    frequency: 'daily' | 'weekly' | 'monthly',
    duration: number // in days
  ): Promise<Array<{
    date: Date
    topic: string
    contentType: string
    suggestedTime: Date
  }>> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a content calendar planning expert. Generate a content calendar based on the given topics, frequency, and duration.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            topics,
            frequency,
            duration,
          }),
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    })

    return JSON.parse(response.choices[0].message.content || '[]')
  }

  async analyzeCompetitorContent(
    competitorContent: Array<{
      content: string
      engagement: {
        likes: number
        comments: number
        shares: number
      }
    }>
  ): Promise<{
    topPerformingContent: string[]
    commonTopics: string[]
    engagementPatterns: string[]
    improvementOpportunities: string[]
  }> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a competitor analysis expert. Analyze competitor content to identify patterns, successful strategies, and improvement opportunities.',
        },
        {
          role: 'user',
          content: JSON.stringify(competitorContent),
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    })

    return JSON.parse(response.choices[0].message.content || '{}')
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
    preferences: any
  ): Promise<void> {
    try {
      await prisma.userPreferences.update({
        where: { userId },
        data: preferences,
      })
    } catch (error) {
      console.error('Error updating user preferences:', error)
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
}

export const ai = AIService.getInstance() 