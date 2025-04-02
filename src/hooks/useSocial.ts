import { useState } from 'react';
import { useStore } from '@/store';
import { SocialMediaService } from '@/services/social';
import { Post, SocialPlatform } from '@/types';

const socialService = new SocialMediaService();

export const useSocial = () => {
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    posts,
    addPost,
    updatePost,
    deletePost,
    setError: setStoreError,
    activePlatforms,
    setActivePlatforms,
    togglePlatform,
  } = useStore();

  const crossPost = async (content: string, mediaUrl?: string) => {
    try {
      setIsPosting(true);
      setError(null);
      const results = await socialService.crossPost(content, mediaUrl, activePlatforms);
      
      // Add new posts to the store
      results.forEach((post) => {
        addPost(post);
      });

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to post content';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsPosting(false);
    }
  };

  const fetchPosts = async (platform: SocialPlatform, userId: string) => {
    try {
      const fetchedPosts = await socialService.fetchPlatformPosts(platform, userId);
      return fetchedPosts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    }
  };

  const deleteSocialPost = async (postId: string, platform: SocialPlatform) => {
    try {
      // Implement platform-specific delete logic here
      deletePost(postId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    }
  };

  return {
    posts,
    isPosting,
    error,
    activePlatforms,
    crossPost,
    fetchPosts,
    deleteSocialPost,
    setActivePlatforms,
    togglePlatform,
  };
}; 