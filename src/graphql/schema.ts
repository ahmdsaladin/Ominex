import { gql } from 'apollo-server-express'

export const typeDefs = gql`
  # Types
  type User {
    id: ID!
    email: String!
    name: String!
    bio: String
    avatar: String
    location: String
    website: String
    createdAt: DateTime!
    updatedAt: DateTime!
    posts: [Post!]!
    followers: [User!]!
    following: [User!]!
    achievements: [Achievement!]!
    settings: UserSettings
    notifications: [Notification!]!
  }

  type UserSettings {
    id: ID!
    emailNotifications: Boolean!
    pushNotifications: Boolean!
    privacy: String!
    language: String!
    timezone: String
    theme: String!
  }

  type Post {
    id: ID!
    content: String!
    media: [String!]!
    visibility: String!
    scheduledFor: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    author: User!
    comments: [Comment!]!
    likes: [Like!]!
    mentions: [Mention!]!
  }

  type Comment {
    id: ID!
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    author: User!
    post: Post!
  }

  type Like {
    id: ID!
    createdAt: DateTime!
    user: User!
    post: Post!
  }

  type Follow {
    id: ID!
    follower: User!
    following: User!
    createdAt: DateTime!
  }

  type Mention {
    id: ID!
    createdAt: DateTime!
    user: User!
    post: Post!
  }

  type Achievement {
    id: ID!
    name: String!
    description: String!
    icon: String!
    points: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Transaction {
    id: ID!
    type: String!
    amount: Float!
    status: String!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    user: User!
  }

  type Notification {
    id: ID!
    type: String!
    data: JSON!
    read: Boolean!
    createdAt: DateTime!
    user: User!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    password: String!
    name: String!
    bio: String
    avatar: String
    location: String
    website: String
  }

  input UpdateUserInput {
    name: String
    bio: String
    avatar: String
    location: String
    website: String
  }

  input CreatePostInput {
    content: String!
    media: [String!]
    visibility: String
    scheduledFor: DateTime
  }

  input UpdatePostInput {
    content: String
    media: [String!]
    visibility: String
    scheduledFor: DateTime
  }

  input CreateCommentInput {
    content: String!
    postId: ID!
  }

  input UpdateUserSettingsInput {
    emailNotifications: Boolean
    pushNotifications: Boolean
    privacy: String
    language: String
    timezone: String
    theme: String
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(
      first: Int
      after: String
      search: String
    ): UserConnection!
    
    # Post queries
    post(id: ID!): Post
    posts(
      first: Int
      after: String
      userId: ID
      visibility: String
    ): PostConnection!
    
    # Feed queries
    feed(
      first: Int
      after: String
    ): PostConnection!
    
    # Achievement queries
    achievements: [Achievement!]!
    userAchievements(userId: ID!): [Achievement!]!
    
    # Transaction queries
    transactions(
      userId: ID!
      type: String
      status: String
    ): [Transaction!]!
    
    # Notification queries
    notifications(
      first: Int
      after: String
      read: Boolean
    ): NotificationConnection!
  }

  # Mutations
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(input: UpdateUserInput!): User!
    deleteUser: Boolean!
    
    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    
    # Comment mutations
    createComment(input: CreateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!
    
    # Like mutations
    likePost(postId: ID!): Like!
    unlikePost(postId: ID!): Boolean!
    
    # Follow mutations
    followUser(userId: ID!): Follow!
    unfollowUser(userId: ID!): Boolean!
    
    # Settings mutations
    updateSettings(input: UpdateUserSettingsInput!): UserSettings!
    
    # Notification mutations
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    newPost: Post!
    newComment(postId: ID!): Comment!
    newLike(postId: ID!): Like!
    newFollower: User!
    newNotification: Notification!
  }

  # Custom scalars
  scalar DateTime
  scalar JSON
` 