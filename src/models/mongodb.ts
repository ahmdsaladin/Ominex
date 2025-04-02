import mongoose from 'mongoose'

// Cached Feed Schema
const CachedFeedSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  posts: [{
    id: String,
    content: String,
    media: [String],
    author: {
      id: String,
      name: String,
      avatar: String
    },
    likes: Number,
    comments: Number,
    createdAt: Date
  }],
  lastUpdated: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
})

// User Preferences Schema
const UserPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  theme: { type: String, default: 'light' },
  language: { type: String, default: 'en' },
  timezone: String,
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  privacy: {
    profileVisibility: { type: String, default: 'public' },
    postVisibility: { type: String, default: 'public' }
  },
  contentPreferences: {
    categories: [String],
    tags: [String],
    excludedContent: [String]
  },
  lastUpdated: { type: Date, default: Date.now }
})

// Chat History Schema
const ChatMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  media: [String],
  type: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now }
})

// Analytics Cache Schema
const AnalyticsCacheSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  metrics: {
    followers: Number,
    following: Number,
    posts: Number,
    likes: Number,
    comments: Number,
    engagement: Number
  },
  trends: [{
    date: Date,
    followers: Number,
    engagement: Number
  }],
  lastUpdated: { type: Date, default: Date.now }
})

// Search Index Schema
const SearchIndexSchema = new mongoose.Schema({
  type: { type: String, enum: ['user', 'post', 'tag'], required: true },
  id: { type: String, required: true },
  content: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Create indexes for better query performance
CachedFeedSchema.index({ userId: 1, lastUpdated: -1 })
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 })
SearchIndexSchema.index({ type: 1, content: 'text' })

// Create models
export const CachedFeed = mongoose.model('CachedFeed', CachedFeedSchema)
export const UserPreferences = mongoose.model('UserPreferences', UserPreferencesSchema)
export const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema)
export const AnalyticsCache = mongoose.model('AnalyticsCache', AnalyticsCacheSchema)
export const SearchIndex = mongoose.model('SearchIndex', SearchIndexSchema)

// TTL indexes for automatic cleanup
CachedFeedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }) // 30 days 