import { useState } from 'react';
import { useStore } from '@/store';
import { AIService } from '@/services/ai';
import { UserPreferences } from '@/types';

export const useAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { posts, setError: setStoreError } = useStore();

  const getRecommendations = async (userPreferences: UserPreferences) => {
    try {
      setIsLoading(true);
      setError(null);
      const recommendations = await AIService.getRecommendations(userPreferences, posts);
      return recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get content recommendations';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeContent = async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const analysis = await AIService.analyzeContent(content);
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze content';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getRecommendations,
    analyzeContent,
  };
}; 