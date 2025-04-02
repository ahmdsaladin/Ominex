// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  preferences: UserPreferences;
  network: {
    followers: User[];
    following: User[];
  };
}

// Social Media Types
export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  userId: string;
  user: User;
}

export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok';

// Post Types
export interface Post {
  id: string;
  authorId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'link';
  media?: Media[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  location?: {
    name: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface Story {
  id: string;
  authorId: string;
  content: string;
  type: 'image' | 'video';
  media: Media[];
  views: number;
  createdAt: Date;
  expiresAt: Date;
  location?: {
    name: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface Media {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
}

// Interaction Types
export interface UserInteraction {
  id: string;
  userId: string;
  type: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE';
  postId?: string;
  storyId?: string;
  timestamp: Date;
  duration?: number;
  metadata?: {
    device?: string;
    location?: {
      lat: number;
      lng: number;
    };
    platform?: string;
  };
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likes: number;
  replies: number;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  media?: Media[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'TAG';
  content: string;
  read: boolean;
  createdAt: Date;
  metadata?: {
    postId?: string;
    storyId?: string;
    commentId?: string;
    userId?: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  media?: Media[];
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    platform?: string;
    status?: 'sent' | 'delivered' | 'read';
  };
}

export interface Call {
  id: string;
  initiatorId: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'pending' | 'active' | 'ended' | 'missed' | 'rejected';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  quality?: {
    audio: number;
    video?: number;
    network: number;
  };
  metadata?: {
    platform?: string;
    device?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

// NFT Types
export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  metadata: {
    attributes: {
      trait_type: string;
      value: string;
    }[];
    external_url?: string;
    background_color?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: {
    trait_type: string;
    value: string;
  }[];
}

// AI Types
export interface ContentRecommendation {
  postId: string;
  score: number;
  reasons: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'cyberpunk';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  reducedMotion: boolean;
  feedLayout: 'grid' | 'list' | 'stories';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    anonymousMode: boolean;
    dataSharing: boolean;
    blockchainControl: boolean;
    biometricAuth: boolean;
  };
}

// Security Types
export interface EncryptedMessage {
  content: string;
  iv: string;
  tag: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  privacyLevel: 'public' | 'friends' | 'private';
  dataEncryption: boolean;
} 