export const socialTypeDefs = `
  type SocialMediaProfile {
    platform: SocialPlatform!
    userId: ID!
    username: String!
    displayName: String
    profileUrl: String
    avatarUrl: String
    bio: String
    followersCount: Int
    followingCount: Int
    postsCount: Int
    isVerified: Boolean
    metadata: JSON
  }

  type SocialMediaPost {
    platform: SocialPlatform!
    postId: ID!
    userId: ID!
    content: String!
    mediaUrls: [String!]
    createdAt: DateTime!
    updatedAt: DateTime
    likesCount: Int
    commentsCount: Int
    sharesCount: Int
    viewsCount: Int
    isLiked: Boolean
    isReposted: Boolean
    isBookmarked: Boolean
    metadata: JSON
  }

  type SocialMediaComment {
    platform: SocialPlatform!
    commentId: ID!
    postId: ID!
    userId: ID!
    content: String!
    createdAt: DateTime!
    likesCount: Int
    repliesCount: Int
    isLiked: Boolean
    metadata: JSON
  }

  type SocialMediaStats {
    platform: SocialPlatform!
    userId: ID!
    followersCount: Int!
    followingCount: Int!
    postsCount: Int!
    engagementRate: Float!
    averageLikes: Float!
    averageComments: Float!
    averageShares: Float!
    topHashtags: [String!]!
    topTopics: [String!]!
    lastUpdated: DateTime!
  }

  type SocialMediaAuth {
    platform: SocialPlatform!
    userId: ID!
    accessToken: String!
    refreshToken: String
    tokenExpiresAt: DateTime
    scope: [String!]
    metadata: JSON
  }

  enum SocialPlatform {
    FACEBOOK
    INSTAGRAM
    TWITTER
    LINKEDIN
    TIKTOK
    SNAPCHAT
    YOUTUBE
    REDDIT
    PINTEREST
    TELEGRAM
    DISCORD
    MASTODON
    BLUESKY
  }

  type SocialMediaError {
    platform: SocialPlatform!
    code: String!
    message: String!
    status: Int
    details: JSON
  }

  extend type Query {
    socialAuthUrl(platform: SocialPlatform!): String!
    socialProfile(platform: SocialPlatform!, userId: ID!): SocialMediaProfile!
    socialPosts(platform: SocialPlatform!, userId: ID!, limit: Int): [SocialMediaPost!]!
    socialStats(platform: SocialPlatform!, userId: ID!): SocialMediaStats!
    socialComments(platform: SocialPlatform!, postId: ID!, limit: Int): [SocialMediaComment!]!
  }

  extend type Mutation {
    socialAuthCallback(platform: SocialPlatform!, code: String!): SocialMediaAuth!
    socialRefreshToken(platform: SocialPlatform!): SocialMediaAuth!
    socialRevokeToken(platform: SocialPlatform!): Boolean!
    socialCreatePost(platform: SocialPlatform!, content: String!, mediaUrls: [String!]): SocialMediaPost!
    socialUpdatePost(platform: SocialPlatform!, postId: ID!, content: String!): SocialMediaPost!
    socialDeletePost(platform: SocialPlatform!, postId: ID!): Boolean!
    socialLikePost(platform: SocialPlatform!, postId: ID!): Boolean!
    socialUnlikePost(platform: SocialPlatform!, postId: ID!): Boolean!
    socialSharePost(platform: SocialPlatform!, postId: ID!, message: String): Boolean!
    socialCreateComment(platform: SocialPlatform!, postId: ID!, content: String!): SocialMediaComment!
    socialDeleteComment(platform: SocialPlatform!, commentId: ID!): Boolean!
    socialLikeComment(platform: SocialPlatform!, commentId: ID!): Boolean!
    socialUnlikeComment(platform: SocialPlatform!, commentId: ID!): Boolean!
  }

  extend type Subscription {
    socialPostUpdate(platform: SocialPlatform!, postId: ID!): SocialMediaPost!
    socialCommentUpdate(platform: SocialPlatform!, postId: ID!): SocialMediaComment!
  }
` 