import { PrismaClient } from '@prisma/client'
import { withCache, withErrorHandling } from '../lib/mongodb'
import { pubsub } from './pubsub'
import { GraphQLScalarType } from 'graphql'
import { DateTimeResolver, JSONResolver } from 'graphql-scalars'

const prisma = new PrismaClient()

// Custom scalar resolvers
const DateTime = DateTimeResolver
const JSON = JSONResolver

// Context type
interface Context {
  user?: {
    id: string
    email: string
  }
}

// Query resolvers
const Query = {
  me: async (_: any, __: any, context: Context) => {
    if (!context.user) return null
    return prisma.user.findUnique({
      where: { id: context.user.id },
      include: {
        settings: true,
        posts: true,
        followers: { include: { follower: true } },
        following: { include: { following: true } },
        achievements: { include: { achievement: true } },
        notifications: true
      }
    })
  },

  user: async (_: any, { id }: { id: string }) => {
    return prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        posts: true,
        followers: { include: { follower: true } },
        following: { include: { following: true } },
        achievements: { include: { achievement: true } }
      }
    })
  },

  users: async (_: any, { first = 10, after, search }: { first?: number; after?: string; search?: string }) => {
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    const users = await prisma.user.findMany({
      where,
      take: first,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      include: {
        settings: true,
        posts: true,
        followers: true,
        following: true
      }
    })

    return {
      edges: users.map(user => ({
        cursor: user.id,
        node: user
      })),
      pageInfo: {
        hasNextPage: users.length === first,
        endCursor: users[users.length - 1]?.id
      }
    }
  },

  post: async (_: any, { id }: { id: string }) => {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        comments: { include: { author: true } },
        likes: { include: { user: true } },
        mentions: { include: { user: true } }
      }
    })
  },

  posts: async (_: any, { first = 10, after, userId, visibility }: { first?: number; after?: string; userId?: string; visibility?: string }) => {
    const where = {
      ...(userId && { authorId: userId }),
      ...(visibility && { visibility })
    }

    const posts = await prisma.post.findMany({
      where,
      take: first,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      include: {
        author: true,
        comments: { include: { author: true } },
        likes: { include: { user: true } },
        mentions: { include: { user: true } }
      }
    })

    return {
      edges: posts.map(post => ({
        cursor: post.id,
        node: post
      })),
      pageInfo: {
        hasNextPage: posts.length === first,
        endCursor: posts[posts.length - 1]?.id
      }
    }
  },

  feed: async (_: any, { first = 10, after }: { first?: number; after?: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')

    // Get cached feed from MongoDB
    const cachedFeed = await withCache(
      `feed:${context.user.id}`,
      async () => {
        const following = await prisma.follow.findMany({
          where: { followerId: context.user!.id },
          select: { followingId: true }
        })

        const followingIds = following.map(f => f.followingId)

        const posts = await prisma.post.findMany({
          where: {
            OR: [
              { authorId: { in: followingIds } },
              { visibility: 'public' }
            ]
          },
          take: first,
          skip: after ? 1 : 0,
          cursor: after ? { id: after } : undefined,
          include: {
            author: true,
            comments: { include: { author: true } },
            likes: { include: { user: true } },
            mentions: { include: { user: true } }
          }
        })

        return {
          edges: posts.map(post => ({
            cursor: post.id,
            node: post
          })),
          pageInfo: {
            hasNextPage: posts.length === first,
            endCursor: posts[posts.length - 1]?.id
          }
        }
      },
      300 // Cache for 5 minutes
    )

    return cachedFeed
  },

  achievements: async () => {
    return prisma.achievement.findMany()
  },

  userAchievements: async (_: any, { userId }: { userId: string }) => {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    })
  },

  transactions: async (_: any, { userId, type, status }: { userId: string; type?: string; status?: string }) => {
    const where = {
      userId,
      ...(type && { type }),
      ...(status && { status })
    }

    return prisma.transaction.findMany({ where })
  },

  notifications: async (_: any, { first = 10, after, read }: { first?: number; after?: string; read?: boolean }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')

    const where = {
      userId: context.user.id,
      ...(read !== undefined && { read })
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: first,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined
    })

    return {
      edges: notifications.map(notification => ({
        cursor: notification.id,
        node: notification
      })),
      pageInfo: {
        hasNextPage: notifications.length === first,
        endCursor: notifications[notifications.length - 1]?.id
      }
    }
  }
}

// Mutation resolvers
const Mutation = {
  createUser: async (_: any, { input }: { input: any }) => {
    const user = await prisma.user.create({
      data: input,
      include: {
        settings: true
      }
    })
    return user
  },

  updateUser: async (_: any, { input }: { input: any }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    return prisma.user.update({
      where: { id: context.user.id },
      data: input,
      include: {
        settings: true
      }
    })
  },

  deleteUser: async (_: any, __: any, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    await prisma.user.delete({
      where: { id: context.user.id }
    })
    return true
  },

  createPost: async (_: any, { input }: { input: any }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const post = await prisma.post.create({
      data: {
        ...input,
        authorId: context.user.id
      },
      include: {
        author: true,
        comments: { include: { author: true } },
        likes: { include: { user: true } },
        mentions: { include: { user: true } }
      }
    })

    // Publish new post subscription
    pubsub.publish('NEW_POST', { newPost: post })

    return post
  },

  updatePost: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: true }
    })

    if (!post) throw new Error('Post not found')
    if (post.authorId !== context.user.id) throw new Error('Not authorized')

    return prisma.post.update({
      where: { id },
      data: input,
      include: {
        author: true,
        comments: { include: { author: true } },
        likes: { include: { user: true } },
        mentions: { include: { user: true } }
      }
    })
  },

  deletePost: async (_: any, { id }: { id: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: true }
    })

    if (!post) throw new Error('Post not found')
    if (post.authorId !== context.user.id) throw new Error('Not authorized')

    await prisma.post.delete({ where: { id } })
    return true
  },

  createComment: async (_: any, { input }: { input: any }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const comment = await prisma.comment.create({
      data: {
        ...input,
        authorId: context.user.id
      },
      include: {
        author: true,
        post: true
      }
    })

    // Publish new comment subscription
    pubsub.publish('NEW_COMMENT', { newComment: comment })

    return comment
  },

  deleteComment: async (_: any, { id }: { id: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { author: true }
    })

    if (!comment) throw new Error('Comment not found')
    if (comment.authorId !== context.user.id) throw new Error('Not authorized')

    await prisma.comment.delete({ where: { id } })
    return true
  },

  likePost: async (_: any, { postId }: { postId: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const like = await prisma.like.create({
      data: {
        userId: context.user.id,
        postId
      },
      include: {
        user: true,
        post: true
      }
    })

    // Publish new like subscription
    pubsub.publish('NEW_LIKE', { newLike: like })

    return like
  },

  unlikePost: async (_: any, { postId }: { postId: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    await prisma.like.delete({
      where: {
        userId_postId: {
          userId: context.user.id,
          postId
        }
      }
    })
    return true
  },

  followUser: async (_: any, { userId }: { userId: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    const follow = await prisma.follow.create({
      data: {
        followerId: context.user.id,
        followingId: userId
      },
      include: {
        follower: true,
        following: true
      }
    })

    // Publish new follower subscription
    pubsub.publish('NEW_FOLLOWER', { newFollower: follow.following })

    return follow
  },

  unfollowUser: async (_: any, { userId }: { userId: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: context.user.id,
          followingId: userId
        }
      }
    })
    return true
  },

  updateSettings: async (_: any, { input }: { input: any }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    return prisma.userSettings.update({
      where: { userId: context.user.id },
      data: input
    })
  },

  markNotificationAsRead: async (_: any, { id }: { id: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    return prisma.notification.update({
      where: { id },
      data: { read: true }
    })
  },

  markAllNotificationsAsRead: async (_: any, __: any, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    await prisma.notification.updateMany({
      where: {
        userId: context.user.id,
        read: false
      },
      data: { read: true }
    })
    return true
  },

  deleteNotification: async (_: any, { id }: { id: string }, context: Context) => {
    if (!context.user) throw new Error('Not authenticated')
    await prisma.notification.delete({
      where: { id }
    })
    return true
  }
}

// Subscription resolvers
const Subscription = {
  newPost: {
    subscribe: () => pubsub.asyncIterator('NEW_POST')
  },
  newComment: {
    subscribe: (_: any, { postId }: { postId: string }) => 
      pubsub.asyncIterator(`NEW_COMMENT_${postId}`)
  },
  newLike: {
    subscribe: (_: any, { postId }: { postId: string }) => 
      pubsub.asyncIterator(`NEW_LIKE_${postId}`)
  },
  newFollower: {
    subscribe: (_: any, __: any, context: Context) => {
      if (!context.user) throw new Error('Not authenticated')
      return pubsub.asyncIterator(`NEW_FOLLOWER_${context.user.id}`)
    }
  },
  newNotification: {
    subscribe: (_: any, __: any, context: Context) => {
      if (!context.user) throw new Error('Not authenticated')
      return pubsub.asyncIterator(`NEW_NOTIFICATION_${context.user.id}`)
    }
  }
}

export const resolvers = {
  DateTime,
  JSON,
  Query,
  Mutation,
  Subscription
} 