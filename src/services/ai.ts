import { env } from '@/config/env';
import { ContentRecommendation, UserPreferences, Post } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: env.openai.apiKey,
});

interface AIRecommendationResponse {
  postId: string;
  score: number;
  reasons: string[];
}

export class AIService {
  // Generate personalized content recommendations
  static async getRecommendations(
    userPreferences: UserPreferences,
    posts: Post[]
  ): Promise<ContentRecommendation[]> {
    try {
      // Analyze user interests and engagement history
      const interests = userPreferences.interests.join(', ');
      const engagementSummary = this.generateEngagementSummary(userPreferences.engagementHistory);

      // Use OpenAI to analyze and rank posts
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a content recommendation system. Analyze posts and rank them based on user interests and engagement history."
          },
          {
            role: "user",
            content: `User interests: ${interests}\nEngagement history: ${engagementSummary}\nPosts: ${JSON.stringify(posts)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Parse and format recommendations
      const recommendations = this.parseRecommendations(response.choices[0].message.content);
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Generate engagement summary for AI analysis
  private static generateEngagementSummary(engagementHistory: UserPreferences['engagementHistory']): string {
    const summary = {
      totalEngagements: engagementHistory.length,
      byAction: engagementHistory.reduce((acc, curr) => {
        acc[curr.action] = (acc[curr.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentEngagements: engagementHistory
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(e => `${e.action} on post ${e.postId}`)
        .join(', '),
    };

    return JSON.stringify(summary);
  }

  // Parse AI response into structured recommendations
  private static parseRecommendations(aiResponse: string | null): ContentRecommendation[] {
    if (!aiResponse) return [];

    try {
      const recommendations = JSON.parse(aiResponse) as AIRecommendationResponse[];
      return recommendations.map(rec => ({
        postId: rec.postId,
        score: rec.score,
        reasons: rec.reasons,
      }));
    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return [];
    }
  }

  // Analyze post content for harmful or inappropriate content
  static async analyzeContent(content: string): Promise<{
    isSafe: boolean;
    reasons: string[];
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a content moderation system. Analyze content for harmful or inappropriate material."
          },
          {
            role: "user",
            content: `Analyze this content: ${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isSafe: analysis.isSafe || false,
        reasons: analysis.reasons || [],
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return {
        isSafe: false,
        reasons: ['Error analyzing content'],
      };
    }
  }
} 