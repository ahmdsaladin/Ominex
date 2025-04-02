import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { metricsMiddleware, metricsEndpoint } from '../../../src/middleware/metrics'
import { cache } from '../../../src/lib/cache'

const app = express()
const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(metricsMiddleware)

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  location: z.string().optional(),
  website: z.string().url().optional()
})

const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  privacy: z.enum(['public', 'private', 'friends']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional()
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
app.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/profile', authenticate, async (req, res) => {
  try {
    const updates = updateProfileSchema.parse(req.body)

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Invalidate cache
    await cache.delete(`user:${user.id}`)

    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Update profile error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id }
    })

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' })
    }

    res.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/settings', authenticate, async (req, res) => {
  try {
    const updates = updateSettingsSchema.parse(req.body)

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: updates,
      create: {
        userId: req.user.id,
        ...updates
      }
    })

    res.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Update settings error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/followers', authenticate, async (req, res) => {
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: req.user.id },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    res.json(followers.map(f => f.follower))
  } catch (error) {
    console.error('Get followers error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/following', authenticate, async (req, res) => {
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    res.json(following.map(f => f.following))
  } catch (error) {
    console.error('Get following error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/follow/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId: userId
      }
    })

    // Notify notification service
    await fetch('http://notification-service:3000/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'follow',
        data: { followerId: req.user.id }
      })
    })

    res.json(follow)
  } catch (error) {
    console.error('Follow user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/follow/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: userId
        }
      }
    })

    res.json({ message: 'Unfollowed successfully' })
  } catch (error) {
    console.error('Unfollow user error:', error)
    res.status(500).json({ error: 'Internal server error' })
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
  console.log(`User Service running on port ${PORT}`)
}) 