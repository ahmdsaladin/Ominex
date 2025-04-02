import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { auth } from './auth'
import { prisma } from './db'

export interface SocketUser {
  userId: string
  socketId: string
  connectedAt: Date
}

export class WebSocketService {
  private io: Server
  private connectedUsers: Map<string, SocketUser>

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })
    this.connectedUsers = new Map()

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          throw new Error('Authentication error')
        }

        const user = await auth.getUserFromToken(token)
        if (!user) {
          throw new Error('User not found')
        }

        socket.data.user = user
        next()
      } catch (error) {
        next(new Error('Authentication error'))
      }
    })

    this.io.on('connection', (socket) => {
      const user = socket.data.user
      this.handleConnection(socket, user)

      socket.on('disconnect', () => {
        this.handleDisconnection(socket, user)
      })

      // Real-time messaging
      socket.on('send_message', async (data) => {
        await this.handleMessage(socket, data)
      })

      // Post notifications
      socket.on('post_created', async (data) => {
        await this.handlePostCreated(socket, data)
      })

      socket.on('post_updated', async (data) => {
        await this.handlePostUpdated(socket, data)
      })

      socket.on('post_deleted', async (data) => {
        await this.handlePostDeleted(socket, data)
      })

      // Analytics updates
      socket.on('analytics_update', async (data) => {
        await this.handleAnalyticsUpdate(socket, data)
      })

      // Platform status updates
      socket.on('platform_status', async (data) => {
        await this.handlePlatformStatus(socket, data)
      })
    })
  }

  private handleConnection(socket: any, user: any): void {
    const socketUser: SocketUser = {
      userId: user.id,
      socketId: socket.id,
      connectedAt: new Date(),
    }

    this.connectedUsers.set(user.id, socketUser)

    // Join user's personal room
    socket.join(`user:${user.id}`)

    // Join user's platform-specific rooms
    prisma.account.findMany({
      where: { userId: user.id },
      select: { platform: true },
    }).then((accounts) => {
      accounts.forEach((account) => {
        socket.join(`platform:${account.platform}`)
      })
    })

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to Ominex WebSocket server',
      userId: user.id,
    })
  }

  private handleDisconnection(socket: any, user: any): void {
    this.connectedUsers.delete(user.id)
  }

  private async handleMessage(socket: any, data: any): Promise<void> {
    const { receiverId, content, platform } = data
    const sender = socket.data.user

    // Store message in database
    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId,
        platform,
        content,
        media: [],
      },
    })

    // Emit to receiver if online
    const receiverSocket = this.connectedUsers.get(receiverId)
    if (receiverSocket) {
      this.io.to(receiverSocket.socketId).emit('new_message', {
        messageId: message.id,
        senderId: sender.id,
        content,
        platform,
        timestamp: new Date(),
      })
    }
  }

  private async handlePostCreated(socket: any, data: any): Promise<void> {
    const { postId, platform } = data
    const user = socket.data.user

    // Store post in database
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        platform,
        type: 'POST',
        content: data.content,
        media: data.media,
        metadata: data.metadata,
        isPublished: true,
        publishedAt: new Date(),
      },
    })

    // Notify followers
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { followerId: true },
    })

    followers.forEach((follower) => {
      const followerSocket = this.connectedUsers.get(follower.followerId)
      if (followerSocket) {
        this.io.to(followerSocket.socketId).emit('new_post', {
          postId: post.id,
          userId: user.id,
          platform,
          content: data.content,
          timestamp: new Date(),
        })
      }
    })
  }

  private async handlePostUpdated(socket: any, data: any): Promise<void> {
    const { postId, platform } = data
    const user = socket.data.user

    // Update post in database
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        content: data.content,
        media: data.media,
        metadata: data.metadata,
        updatedAt: new Date(),
      },
    })

    // Notify followers
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { followerId: true },
    })

    followers.forEach((follower) => {
      const followerSocket = this.connectedUsers.get(follower.followerId)
      if (followerSocket) {
        this.io.to(followerSocket.socketId).emit('post_updated', {
          postId: post.id,
          userId: user.id,
          platform,
          content: data.content,
          timestamp: new Date(),
        })
      }
    })
  }

  private async handlePostDeleted(socket: any, data: any): Promise<void> {
    const { postId, platform } = data
    const user = socket.data.user

    // Delete post from database
    await prisma.post.delete({
      where: { id: postId },
    })

    // Notify followers
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { followerId: true },
    })

    followers.forEach((follower) => {
      const followerSocket = this.connectedUsers.get(follower.followerId)
      if (followerSocket) {
        this.io.to(followerSocket.socketId).emit('post_deleted', {
          postId,
          userId: user.id,
          platform,
          timestamp: new Date(),
        })
      }
    })
  }

  private async handleAnalyticsUpdate(socket: any, data: any): Promise<void> {
    const { postId, platform, analytics } = data
    const user = socket.data.user

    // Store analytics in database
    await prisma.analytics.create({
      data: {
        postId,
        platform,
        ...analytics,
      },
    })

    // Emit to post owner
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    })

    if (post && post.userId === user.id) {
      socket.emit('analytics_updated', {
        postId,
        platform,
        analytics,
        timestamp: new Date(),
      })
    }
  }

  private async handlePlatformStatus(socket: any, data: any): Promise<void> {
    const { platform, status } = data
    const user = socket.data.user

    // Update platform status in database
    await prisma.account.update({
      where: {
        userId_platform: {
          userId: user.id,
          platform,
        },
      },
      data: {
        status,
        lastStatusUpdate: new Date(),
      },
    })

    // Emit to platform-specific room
    this.io.to(`platform:${platform}`).emit('platform_status_changed', {
      platform,
      status,
      userId: user.id,
      timestamp: new Date(),
    })
  }

  // Public methods for external use
  public emitToUser(userId: string, event: string, data: any): void {
    const userSocket = this.connectedUsers.get(userId)
    if (userSocket) {
      this.io.to(userSocket.socketId).emit(event, data)
    }
  }

  public emitToPlatform(platform: string, event: string, data: any): void {
    this.io.to(`platform:${platform}`).emit(event, data)
  }

  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data)
  }

  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values())
  }

  public getUserSocket(userId: string): SocketUser | undefined {
    return this.connectedUsers.get(userId)
  }
}

let wsService: WebSocketService | null = null

export function initializeWebSocket(server: HTTPServer): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(server)
  }
  return wsService
}

export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    throw new Error('WebSocket service not initialized')
  }
  return wsService
} 