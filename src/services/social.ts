import { env } from '@/config/env';
import { Post, SocialPlatform } from '@/types';
import axios from 'axios';

interface SocialMediaConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

const platformConfigs: Record<SocialPlatform, SocialMediaConfig> = {
  facebook: {
    baseUrl: 'https://graph.facebook.com/v18.0',
    apiKey: env.facebook.appId,
    apiSecret: env.facebook.appSecret,
  },
  twitter: {
    baseUrl: 'https://api.twitter.com/2',
    apiKey: env.twitter.apiKey,
    apiSecret: env.twitter.apiSecret,
  },
  instagram: {
    baseUrl: 'https://graph.instagram.com/v18.0',
    apiKey: env.instagram.appId,
    apiSecret: env.instagram.appSecret,
  },
  linkedin: {
    baseUrl: 'https://api.linkedin.com/v2',
    apiKey: env.linkedin.clientId,
    apiSecret: env.linkedin.clientSecret,
  },
  tiktok: {
    baseUrl: 'https://open.tiktokapis.com/v2',
    apiKey: env.tiktok.clientKey,
    apiSecret: env.tiktok.clientSecret,
  },
};

export class SocialMediaService {
  // Post content to multiple platforms
  async crossPost(
    content: string,
    mediaUrl?: string,
    platforms: SocialPlatform[] = ['facebook', 'twitter', 'instagram']
  ): Promise<Post[]> {
    const posts: Post[] = [];

    for (const platform of platforms) {
      try {
        const post = await this.postToPlatform(platform, content, mediaUrl);
        posts.push(post);
      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
      }
    }

    return posts;
  }

  // Post to a specific platform
  private async postToPlatform(
    platform: SocialPlatform,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    const config = platformConfigs[platform];
    
    switch (platform) {
      case 'facebook':
        return this.postToFacebook(config, content, mediaUrl);
      case 'twitter':
        return this.postToTwitter(config, content, mediaUrl);
      case 'instagram':
        return this.postToInstagram(config, content, mediaUrl);
      case 'linkedin':
        return this.postToLinkedIn(config, content, mediaUrl);
      case 'tiktok':
        return this.postToTikTok(config, content, mediaUrl);
    }
  }

  // Platform-specific posting methods
  private async postToFacebook(
    config: SocialMediaConfig,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    const response = await axios.post(
      `${config.baseUrl}/me/feed`,
      {
        message: content,
        ...(mediaUrl && { attached_media: [{ media_fbid: mediaUrl }] }),
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      content,
      mediaUrl,
      platform: 'facebook',
      platformId: response.data.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user-id', // Will be replaced with actual user ID
      user: null as any, // Will be populated by the database
    };
  }

  private async postToTwitter(
    config: SocialMediaConfig,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    const response = await axios.post(
      `${config.baseUrl}/tweets`,
      {
        text: content,
        ...(mediaUrl && { media: { media_ids: [mediaUrl] } }),
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.data.id,
      content,
      mediaUrl,
      platform: 'twitter',
      platformId: response.data.data.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user-id', // Will be replaced with actual user ID
      user: null as any, // Will be populated by the database
    };
  }

  private async postToInstagram(
    config: SocialMediaConfig,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    // Instagram requires a two-step process for media upload
    let mediaId;
    if (mediaUrl) {
      const mediaResponse = await axios.post(
        `${config.baseUrl}/me/media`,
        {
          image_url: mediaUrl,
          caption: content,
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        }
      );
      mediaId = mediaResponse.data.id;
    }

    const response = await axios.post(
      `${config.baseUrl}/me/media_publish`,
      {
        creation_id: mediaId,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      content,
      mediaUrl,
      platform: 'instagram',
      platformId: response.data.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user-id', // Will be replaced with actual user ID
      user: null as any, // Will be populated by the database
    };
  }

  private async postToLinkedIn(
    config: SocialMediaConfig,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    const response = await axios.post(
      `${config.baseUrl}/ugcPosts`,
      {
        author: 'urn:li:person:current-user-id',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            ...(mediaUrl && {
              shareMediaCategory: 'IMAGE',
              media: [
                {
                  status: 'READY',
                  originalUrl: mediaUrl,
                },
              ],
            }),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      content,
      mediaUrl,
      platform: 'linkedin',
      platformId: response.data.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user-id', // Will be replaced with actual user ID
      user: null as any, // Will be populated by the database
    };
  }

  private async postToTikTok(
    config: SocialMediaConfig,
    content: string,
    mediaUrl?: string
  ): Promise<Post> {
    const response = await axios.post(
      `${config.baseUrl}/video/publish`,
      {
        source_info: {
          source: 'FILE_UPLOAD',
          video_id: mediaUrl,
        },
        title: content,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      }
    );

    return {
      id: response.data.data.video_id,
      content,
      mediaUrl,
      platform: 'tiktok',
      platformId: response.data.data.video_id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'current-user-id', // Will be replaced with actual user ID
      user: null as any, // Will be populated by the database
    };
  }

  // Fetch posts from a specific platform
  async fetchPlatformPosts(
    platform: SocialPlatform,
    userId: string
  ): Promise<Post[]> {
    const config = platformConfigs[platform];
    
    try {
      const response = await axios.get(
        `${config.baseUrl}/me/posts`,
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        }
      );

      return response.data.data.map((post: any) => ({
        id: post.id,
        content: post.message || post.text || '',
        mediaUrl: post.attachments?.media_keys?.[0] || null,
        platform,
        platformId: post.id,
        createdAt: new Date(post.created_time),
        updatedAt: new Date(post.updated_time),
        userId,
        user: null as any, // Will be populated by the database
      }));
    } catch (error) {
      console.error(`Error fetching posts from ${platform}:`, error);
      return [];
    }
  }
} 