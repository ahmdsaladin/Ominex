export const aiTypeDefs = `
  type Recommendation {
    contentId: ID!
    score: Float!
    engagementScore: Float!
    confidence: Float!
    finalScore: Float!
  }

  type InteractionContext {
    timeOfDay: Int!
    dayOfWeek: Int!
    deviceType: String!
    location: String
    timeSinceLastInteraction: Float
  }

  type InteractionResponse {
    success: Boolean!
    message: String!
  }

  extend type Query {
    personalizedFeed(limit: Int): [Recommendation!]!
  }

  extend type Mutation {
    recordInteraction(
      contentId: ID!
      interactionType: String!
      context: InteractionContext!
    ): InteractionResponse!
  }

  extend type Subscription {
    feedUpdate: [Recommendation!]!
  }
` 