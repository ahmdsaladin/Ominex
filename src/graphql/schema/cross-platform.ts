export const crossPlatformTypeDefs = `
  type CrossPlatformPost {
    id: ID!
    userId: ID!
    platform: SocialPlatform!
    postId: ID!
    content: String!
    mediaUrls: [String!]!
    scheduledAt: DateTime
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CrossPlatformComment {
    id: ID!
    userId: ID!
    platform: SocialPlatform!
    postId: ID!
    commentId: ID!
    content: String!
    createdAt: DateTime!
    likesCount: Int
    repliesCount: Int
    isLiked: Boolean
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CrossPlatformReaction {
    id: ID!
    userId: ID!
    platform: SocialPlatform!
    postId: ID!
    likesCount: Int
    isLiked: Boolean
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AggregatedReactions {
    totalLikes: Int!
    platformReactions: [PlatformReaction!]!
  }

  type PlatformReaction {
    platform: SocialPlatform!
    likesCount: Int!
    isLiked: Boolean!
  }

  type ScheduledPost {
    id: ID!
    userId: ID!
    content: String!
    mediaUrls: [String!]!
    platforms: [SocialPlatform!]!
    scheduledAt: DateTime!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateCrossPlatformPostInput {
    content: String!
    mediaUrls: [String!]
    platforms: [SocialPlatform!]!
    scheduledAt: DateTime
    metadata: JSON
  }

  input SchedulePostInput {
    content: String!
    mediaUrls: [String!]
    platforms: [SocialPlatform!]!
    scheduledAt: DateTime!
    metadata: JSON
  }

  extend type Query {
    crossPlatformPost(id: ID!): CrossPlatformPost!
    crossPlatformComments(postId: ID!): [CrossPlatformComment!]!
    aggregatedReactions(postId: ID!): AggregatedReactions!
    scheduledPosts: [ScheduledPost!]!
  }

  extend type Mutation {
    createCrossPlatformPost(input: CreateCrossPlatformPostInput!): [SocialMediaPost!]!
    schedulePost(input: SchedulePostInput!): ScheduledPost!
    cancelScheduledPost(postId: ID!): Boolean!
    syncComments(postId: ID!, platform: SocialPlatform!): [SocialMediaComment!]!
    syncReactions(postId: ID!, platform: SocialPlatform!): Boolean!
  }

  extend type Subscription {
    crossPlatformPostUpdate(postId: ID!): CrossPlatformPost!
    crossPlatformCommentUpdate(postId: ID!): CrossPlatformComment!
    crossPlatformReactionUpdate(postId: ID!): AggregatedReactions!
  }
` 