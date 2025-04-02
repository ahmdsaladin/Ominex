import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { metricsMiddleware, metricsEndpoint } from '../../../src/middleware/metrics'
import { cache } from '../../../src/lib/cache'

const app = express()
const prisma = new PrismaClient()
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(metricsMiddleware)

// Validation schemas
const createPostSchema = z.object({
  content: z.string().max(5000),
  media: z.array(z.string().url()).optional(),
  scheduledFor: z.string().datetime().optional(),
  visibility: z.enum(['public', 'private', 'friends']).default('public')
})

const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  media: z.array(z.string().url()).optional(),
  visibility: z.enum(['public', 'private', 'friends']).optional()
})

// Authentication middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify token with auth service
    const response = await fetch('http://auth-service:3000/verify', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { user } = await response.json()
    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Routes
app.post('/posts', authenticate, async (req, res) => {
  try {
    const { content, media, scheduledFor, visibility } = createPostSchema.parse(req.body)

    const post = await prisma.post.create({
      data: {
        content,
        media,
        scheduledFor,
        visibility,
        authorId: req.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // Invalidate cache
    await cache.delete(`user:${req.user.id}:posts`)

    // Notify followers
    if (visibility === 'public') {
      const followers = await prisma.follow.findMany({
        where: { followingId: req.user.id },
        select: { followerId: true }
      })

      await fetch('http://notification-service:3000/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: followers.map(f => f.followerId),
          type: 'new_post',
          data: { postId: post.id }
        })
      })
    }

    res.status(201).json(post)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Create post error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/posts', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    // Get user's settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id }
    })

    // Get posts based on visibility settings
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { visibility: 'public' },
          { authorId: req.user.id },
          {
            AND: [
              { visibility: 'friends' },
              {
                author: {
                  followers: {
                    some: {
                      followerId: req.user.id
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    })

    res.json(posts)
  } catch (error) {
    console.error('Get posts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json(post)
  } catch (error) {
    console.error('Get post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/posts/:id', authenticate, async (req, res) => {
  try {
    const updates = updatePostSchema.parse(req.body)

    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: updates,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // Invalidate cache
    await cache.delete(`post:${post.id}`)
    await cache.delete(`user:${req.user.id}:posts`)

    res.json(updatedPost)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Update post error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.post.delete({
      where: { id: req.params.id }
    })

    // Invalidate cache
    await cache.delete(`post:${post.id}`)
    await cache.delete(`user:${req.user.id}:posts`)

    res.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const like = await prisma.like.create({
      data: {
        postId: req.params.id,
        userId: req.user.id
      }
    })

    // Notify post author
    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    })

    if (post && post.authorId !== req.user.id) {
      await fetch('http://notification-service:3000/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: post.authorId,
          type: 'like',
          data: { postId: post.id, userId: req.user.id }
        })
      })
    }

    res.json(like)
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/posts/:id/like', authenticate, async (req, res) => {
  try {
    await prisma.like.delete({
      where: {
        postId_userId: {
          postId: req.params.id,
          userId: req.user.id
        }
      }
    })

    res.json({ message: 'Like removed successfully' })
  } catch (error) {
    console.error('Unlike post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const { content } = z.object({ content: z.string().max(1000) }).parse(req.body)

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: req.params.id,
        authorId: req.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // Notify post author
    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    })

    if (post && post.authorId !== req.user.id) {
      await fetch('http://notification-service:3000/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: post.authorId,
          type: 'comment',
          data: { postId: post.id, commentId: comment.id }
        })
      })
    }

    res.status(201).json(comment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Create comment error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Metrics endpoint
app.get('/metrics', metricsEndpoint)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Post Service running on port ${PORT}`)
}) 