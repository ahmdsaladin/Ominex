import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { Server } from 'socket.io'
import { createServer } from 'http'
import nodemailer from 'nodemailer'
import { metricsMiddleware, metricsEndpoint } from '../../../src/middleware/metrics'
import { cache } from '../../../src/lib/cache'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient()

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(metricsMiddleware)

// Validation schemas
const notificationSchema = z.object({
  userIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
  type: z.enum(['follow', 'like', 'comment', 'new_post', 'mention']),
  data: z.record(z.any())
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`)
    console.log(`User ${userId} joined their room`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Routes
app.post('/notify', async (req, res) => {
  try {
    const { userIds, userId, type, data } = notificationSchema.parse(req.body)

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        type,
        data,
        userId: userId || userIds?.[0]
      }
    })

    // Send real-time notification
    const targetUsers = userId ? [userId] : userIds || []
    for (const targetUserId of targetUsers) {
      io.to(`user:${targetUserId}`).emit('notification', notification)
    }

    // Send email notification if enabled
    for (const targetUserId of targetUsers) {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { settings: true }
      })

      if (user?.settings?.emailNotifications) {
        const emailContent = generateEmailContent(type, data)
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: user.email,
          subject: 'New Notification',
          html: emailContent
        })
      }
    }

    res.status(201).json(notification)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
    } else {
      console.error('Create notification error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/notifications', async (req, res) => {
  try {
    const { userId } = req.query
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const notifications = await prisma.notification.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    })

    res.json(notifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    })

    res.json(notification)
  } catch (error) {
    console.error('Mark notification as read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.query

    await prisma.notification.updateMany({
      where: { userId: userId as string, read: false },
      data: { read: true }
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/notifications/:id', async (req, res) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id }
    })

    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper function to generate email content
function generateEmailContent(type: string, data: any): string {
  switch (type) {
    case 'follow':
      return `
        <h2>New Follower</h2>
        <p>Someone followed you on Ominex!</p>
      `
    case 'like':
      return `
        <h2>New Like</h2>
        <p>Someone liked your post on Ominex!</p>
      `
    case 'comment':
      return `
        <h2>New Comment</h2>
        <p>Someone commented on your post on Ominex!</p>
      `
    case 'new_post':
      return `
        <h2>New Post</h2>
        <p>Someone you follow posted new content on Ominex!</p>
      `
    case 'mention':
      return `
        <h2>New Mention</h2>
        <p>Someone mentioned you in a post on Ominex!</p>
      `
    default:
      return `
        <h2>New Notification</h2>
        <p>You have a new notification on Ominex!</p>
      `
  }
}

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
httpServer.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`)
}) 