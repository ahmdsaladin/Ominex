import { RecommendationService } from './recommendations'
import { EngagementPredictor } from './engagement-predictor'
import { TrainingDataCollector } from './training-data-collector'

interface AIConfig {
  recommendationWeight: number
  engagementWeight: number
  minConfidence: number
  batchSize: number
  updateInterval: number
}

export class AIService {
  private static instance: AIService
  private recommendationService: RecommendationService
  private engagementPredictor: EngagementPredictor
  private trainingDataCollector: TrainingDataCollector
  private config: AIConfig
  private updateInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.recommendationService = RecommendationService.getInstance()
    this.engagementPredictor = EngagementPredictor.getInstance()
    this.trainingDataCollector = TrainingDataCollector.getInstance()
    this.config = {
      recommendationWeight: 0.6,
      engagementWeight: 0.4,
      minConfidence: 0.7,
      batchSize: 1000,
      updateInterval: 3600000 // 1 hour
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async initialize(): Promise<void> {
    // Initialize all services
    await Promise.all([
      this.engagementPredictor.initialize(),
      this.startUpdateInterval()
    ])
  }

  async getPersonalizedFeed(userId: string, limit: number = 20): Promise<any[]> {
    // Get recommendations from collaborative and content-based filtering
    const recommendations = await this.recommendationService.getPersonalizedFeed(
      userId,
      limit
    )

    // Get engagement predictions for each recommendation
    const predictions = await Promise.all(
      recommendations.map(async rec => {
        const prediction = await this.engagementPredictor.predictEngagement(
          rec.contentId,
          userId,
          {} // Context will be added later
        )
        return {
          ...rec,
          engagementScore: prediction.engagementScore,
          confidence: prediction.confidence
        }
      })
    )

    // Filter out low confidence predictions
    const highConfidencePredictions = predictions.filter(
      p => p.confidence >= this.config.minConfidence
    )

    // Combine scores with weights
    const combinedScores = highConfidencePredictions.map(pred => ({
      ...pred,
      finalScore:
        pred.score * this.config.recommendationWeight +
        pred.engagementScore * this.config.engagementWeight
    }))

    // Sort by final score and return top results
    return combinedScores
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
  }

  async collectInteractionData(
    userId: string,
    contentId: string,
    interactionType: string,
    context: any
  ): Promise<void> {
    // Collect interaction data
    await this.trainingDataCollector.collectInteractionData(
      userId,
      contentId,
      interactionType,
      context
    )

    // Update engagement metrics
    const metrics = await this.calculateEngagementMetrics(
      userId,
      contentId,
      interactionType
    )

    await this.trainingDataCollector.collectEngagementMetrics(
      userId,
      contentId,
      metrics
    )
  }

  private async calculateEngagementMetrics(
    userId: string,
    contentId: string,
    interactionType: string
  ): Promise<any> {
    // Get interaction history
    const interactions = await this.getInteractionHistory(userId, contentId)

    // Calculate metrics
    return {
      likes: interactions.filter(i => i.type === 'LIKE').length,
      comments: interactions.filter(i => i.type === 'COMMENT').length,
      shares: interactions.filter(i => i.type === 'SHARE').length,
      timeSpent: this.calculateTimeSpent(interactions)
    }
  }

  private async getInteractionHistory(
    userId: string,
    contentId: string
  ): Promise<any[]> {
    // Implement interaction history retrieval
    return [] // Placeholder
  }

  private calculateTimeSpent(interactions: any[]): number {
    // Implement time spent calculation
    return 0 // Placeholder
  }

  private async startUpdateInterval(): Promise<void> {
    // Clear existing interval if any
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    // Start new interval
    this.updateInterval = setInterval(async () => {
      await this.updateModel()
    }, this.config.updateInterval)
  }

  private async updateModel(): Promise<void> {
    try {
      // Get processed training data
      const trainingData = await this.trainingDataCollector.getProcessedData(
        this.config.batchSize
      )

      if (trainingData.length > 0) {
        // Train model with new data
        await this.engagementPredictor.trainModel(trainingData)

        // Clear processed data
        await this.trainingDataCollector.clearProcessedData()
      }
    } catch (error) {
      console.error('Error updating model:', error)
    }
  }

  async shutdown(): Promise<void> {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    // Perform any necessary cleanup
    // Add cleanup logic here
  }

  // Configuration methods
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }

  getConfig(): AIConfig {
    return { ...this.config }
  }
} 