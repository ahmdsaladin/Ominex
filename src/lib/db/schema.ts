import { Prisma } from "@prisma/client";

// Enums for various types
export enum Platform {
  FACEBOOK = "FACEBOOK",
  INSTAGRAM = "INSTAGRAM",
  TWITTER = "TWITTER",
  LINKEDIN = "LINKEDIN",
  TIKTOK = "TIKTOK",
  YOUTUBE = "YOUTUBE",
  SNAPCHAT = "SNAPCHAT",
  REDDIT = "REDDIT",
  DISCORD = "DISCORD",
  TELEGRAM = "TELEGRAM",
  WHATSAPP = "WHATSAPP",
  PINTEREST = "PINTEREST",
  TWITCH = "TWITCH",
  MEDIUM = "MEDIUM",
  WECHAT = "WECHAT",
  THREADS = "THREADS",
}

export enum ContentType {
  POST = "POST",
  STORY = "STORY",
  REEL = "REEL",
  VIDEO = "VIDEO",
  ARTICLE = "ARTICLE",
  PIN = "PIN",
  TWEET = "TWEET",
  MESSAGE = "MESSAGE",
  COMMENT = "COMMENT",
  LIVE_STREAM = "LIVE_STREAM",
}

export enum UserRole {
  USER = "USER",
  CREATOR = "CREATOR",
  ADMIN = "ADMIN",
}

// User model
export const User = {
  id: "string",
  email: "string",
  name: "string",
  username: "string",
  avatar: "string?",
  bio: "string?",
  role: "UserRole",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  lastLogin: "DateTime?",
  isVerified: "boolean",
  isActive: "boolean",
  preferences: "Json?",
  // Relations
  accounts: "Account[]",
  posts: "Post[]",
  comments: "Comment[]",
  likes: "Like[]",
  followers: "Follow[]",
  following: "Follow[]",
  messages: "Message[]",
  notifications: "Notification[]",
  subscriptions: "Subscription[]",
  wallet: "Wallet?",
  nfts: "NFT[]",
}

// Account model (for social media platform connections)
export const Account = {
  id: "string",
  userId: "string",
  platform: "Platform",
  platformUserId: "string",
  accessToken: "string",
  refreshToken: "string?",
  tokenExpiresAt: "DateTime?",
  platformUsername: "string?",
  platformAvatar: "string?",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  user: "User",
}

// Post model (unified content model)
export const Post = {
  id: "string",
  userId: "string",
  platform: "Platform",
  platformPostId: "string?",
  type: "ContentType",
  content: "string",
  media: "Json[]?",
  metadata: "Json?",
  isPublished: "boolean",
  isScheduled: "boolean",
  scheduledFor: "DateTime?",
  publishedAt: "DateTime?",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  user: "User",
  comments: "Comment[]",
  likes: "Like[]",
  shares: "Share[]",
  analytics: "Analytics[]",
}

// Comment model
export const Comment = {
  id: "string",
  userId: "string",
  postId: "string",
  platform: "Platform",
  platformCommentId: "string?",
  content: "string",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  user: "User",
  post: "Post",
  likes: "Like[]",
  replies: "Comment[]",
  parentComment: "Comment?",
}

// Like model
export const Like = {
  id: "string",
  userId: "string",
  postId: "string?",
  commentId: "string?",
  platform: "Platform",
  platformLikeId: "string?",
  createdAt: "DateTime",
  // Relations
  user: "User",
  post: "Post?",
  comment: "Comment?",
}

// Share model
export const Share = {
  id: "string",
  userId: "string",
  postId: "string",
  platform: "Platform",
  platformShareId: "string?",
  createdAt: "DateTime",
  // Relations
  user: "User",
  post: "Post",
}

// Message model (unified messaging)
export const Message = {
  id: "string",
  senderId: "string",
  receiverId: "string",
  platform: "Platform",
  platformMessageId: "string?",
  content: "string",
  media: "Json[]?",
  isRead: "boolean",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  sender: "User",
  receiver: "User",
}

// Notification model
export const Notification = {
  id: "string",
  userId: "string",
  type: "string",
  content: "string",
  data: "Json?",
  isRead: "boolean",
  createdAt: "DateTime",
  // Relations
  user: "User",
}

// Follow model
export const Follow = {
  id: "string",
  followerId: "string",
  followingId: "string",
  platform: "Platform",
  platformFollowId: "string?",
  createdAt: "DateTime",
  // Relations
  follower: "User",
  following: "User",
}

// Analytics model
export const Analytics = {
  id: "string",
  postId: "string",
  platform: "Platform",
  views: "Int",
  likes: "Int",
  comments: "Int",
  shares: "Int",
  engagement: "Float",
  date: "DateTime",
  // Relations
  post: "Post",
}

// Subscription model
export const Subscription = {
  id: "string",
  userId: "string",
  creatorId: "string",
  tier: "string",
  amount: "Float",
  currency: "String",
  status: "String",
  startDate: "DateTime",
  endDate: "DateTime?",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  user: "User",
  creator: "User",
}

// Wallet model (for crypto integration)
export const Wallet = {
  id: "string",
  userId: "string",
  address: "string",
  balance: "Float",
  currency: "String",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  // Relations
  user: "User",
  transactions: "Transaction[]",
}

// NFT model
export const NFT = {
  id: "string",
  userId: "string",
  tokenId: "string",
  contractAddress: "string",
  name: "string",
  description: "string",
  image: "string",
  metadata: "Json?",
  createdAt: "DateTime",
  // Relations
  user: "User",
}

// Transaction model
export const Transaction = {
  id: "string",
  walletId: "string",
  type: "String",
  amount: "Float",
  currency: "String",
  status: "String",
  hash: "String?",
  createdAt: "DateTime",
  // Relations
  wallet: "Wallet",
}

// API Key model (for platform integrations)
export const ApiKey = {
  id: "string",
  platform: "Platform",
  key: "string",
  secret: "string",
  isActive: "boolean",
  createdAt: "DateTime",
  updatedAt: "DateTime",
}

// Rate Limit model
export const RateLimit = {
  id: "string",
  platform: "Platform",
  endpoint: "string",
  limit: "Int",
  remaining: "Int",
  resetAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
} 