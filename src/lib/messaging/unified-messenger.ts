import { Platform } from '@prisma/client'
import { prisma } from '../db'
import { ai } from '../ai'
import { getUnifiedManager } from '../platforms/unified-manager'
import { getWebSocketService } from '../websocket'
import { encrypt, decrypt } from '../crypto'

export interface UnifiedMessage {
  id: string
  content: string
  media?: Array<{
    type: 'image' | 'video' | 'audio'
    url: string
    duration?: number
    size?: number
  }>
  senderId: string
  receiverId: string
  platform: Platform
  isRead: boolean
  timestamp: Date
  metadata: {
    replyTo?: string
    forwardedFrom?: string
    isEdited: boolean
    editHistory?: string[]
  }
}

export interface CallSession {
  id: string
  participants: Array<{
    userId: string
    platform: Platform
    status: 'connecting' | 'connected' | 'disconnected'
  }>
  type: 'voice' | 'video'
  startTime: Date
  endTime?: Date
  status: 'active' | 'ended' | 'failed'
  metadata: {
    quality: 'low' | 'medium' | 'high'
    encryption: 'e2e' | 'transport'
    recording?: boolean
  }
}

export class UnifiedMessenger {
  private unifiedManager: any
  private ws: any
  private activeCalls: Map<string, CallSession>
  private messageQueue: Map<string, UnifiedMessage[]>

  constructor() {
    this.unifiedManager = getUnifiedManager()
    this.ws = getWebSocketService()
    this.activeCalls = new Map()
    this.messageQueue = new Map()
  }

  async initialize(): Promise<void> {
    // Start message queue processor
    setInterval(() => {
      this.processMessageQueue()
    }, 1000) // Process every second
  }

  private async processMessageQueue(): Promise<void> {
    for (const [userId, messages] of this.messageQueue.entries()) {
      if (messages.length === 0) continue

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { accounts: true },
      })

      if (!user) continue

      for (const message of messages) {
        try {
          await this.deliverMessage(message, user)
        } catch (error) {
          console.error(`Error delivering message to user ${userId}:`, error)
        }
      }

      this.messageQueue.set(userId, [])
    }
  }

  private async deliverMessage(message: UnifiedMessage, user: any): Promise<void> {
    const account = user.accounts.find((acc: any) => acc.platform === message.platform)
    if (!account) return

    // Encrypt message content
    const encryptedContent = await encrypt(message.content)

    // Store in database
    const dbMessage = await prisma.message.create({
      data: {
        senderId: message.senderId,
        receiverId: message.receiverId,
        platform: message.platform,
        content: encryptedContent,
        media: message.media,
        isRead: false,
        metadata: message.metadata,
      },
    })

    // Send through WebSocket if user is online
    this.ws.emitToUser(message.receiverId, 'new_message', {
      messageId: dbMessage.id,
      senderId: message.senderId,
      content: message.content,
      platform: message.platform,
      timestamp: new Date(),
    })
  }

  async sendMessage(message: UnifiedMessage): Promise<string> {
    // Add to message queue
    const queue = this.messageQueue.get(message.receiverId) || []
    queue.push(message)
    this.messageQueue.set(message.receiverId, queue)

    return message.id
  }

  async getUnifiedInbox(userId: string, filters?: {
    platforms?: Platform[]
    timeRange?: 'day' | 'week' | 'month' | 'year'
  }): Promise<UnifiedMessage[]> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        ...(filters?.platforms && { platform: { in: filters.platforms } }),
        createdAt: {
          gte: this.getTimeRangeFilter(filters?.timeRange),
        },
      },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Decrypt messages
    return Promise.all(
      messages.map(async (msg) => {
        const decryptedContent = await decrypt(msg.content)
        return {
          id: msg.id,
          content: decryptedContent,
          media: msg.media,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          platform: msg.platform,
          isRead: msg.isRead,
          timestamp: msg.createdAt,
          metadata: msg.metadata,
        }
      })
    )
  }

  async generateSmartReply(
    userId: string,
    conversationId: string,
    context: string
  ): Promise<string[]> {
    // Get conversation history
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        platform: {
          in: [Platform.WHATSAPP, Platform.TELEGRAM, Platform.INSTAGRAM],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Decrypt messages
    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => ({
        content: await decrypt(msg.content),
        senderId: msg.senderId,
      }))
    )

    // Generate smart replies using AI
    const suggestions = await ai.generateContentSuggestion(
      Platform.WHATSAPP, // Default to WhatsApp for messaging
      [], // Target audience not needed for replies
      [], // Topics will be extracted from conversation
      {
        context: decryptedMessages.map((msg) => msg.content).join('\n'),
        currentContext: context,
      }
    )

    return suggestions.replies || []
  }

  async initiateCall(
    callerId: string,
    receiverId: string,
    type: 'voice' | 'video'
  ): Promise<CallSession> {
    const session: CallSession = {
      id: Math.random().toString(36).substring(7),
      participants: [
        {
          userId: callerId,
          platform: await this.getUserPreferredPlatform(callerId),
          status: 'connecting',
        },
        {
          userId: receiverId,
          platform: await this.getUserPreferredPlatform(receiverId),
          status: 'connecting',
        },
      ],
      type,
      startTime: new Date(),
      status: 'active',
      metadata: {
        quality: 'high',
        encryption: 'e2e',
      },
    }

    this.activeCalls.set(session.id, session)

    // Notify participants
    this.ws.emitToUser(callerId, 'call_initiated', {
      sessionId: session.id,
      type,
      receiverId,
    })

    this.ws.emitToUser(receiverId, 'incoming_call', {
      sessionId: session.id,
      type,
      callerId,
    })

    return session
  }

  private async getUserPreferredPlatform(userId: string): Promise<Platform> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    })

    if (!user) throw new Error('User not found')

    // Prefer platforms with active status
    const activeAccount = user.accounts.find((acc) => acc.status === 'active')
    if (activeAccount) return activeAccount.platform

    // Fallback to first available platform
    return user.accounts[0]?.platform || Platform.WHATSAPP
  }

  async endCall(sessionId: string): Promise<void> {
    const session = this.activeCalls.get(sessionId)
    if (!session) return

    session.status = 'ended'
    session.endTime = new Date()

    // Notify participants
    for (const participant of session.participants) {
      this.ws.emitToUser(participant.userId, 'call_ended', {
        sessionId,
        duration: session.endTime.getTime() - session.startTime.getTime(),
      })
    }

    this.activeCalls.delete(sessionId)
  }

  async updateCallQuality(
    sessionId: string,
    quality: 'low' | 'medium' | 'high'
  ): Promise<void> {
    const session = this.activeCalls.get(sessionId)
    if (!session) return

    session.metadata.quality = quality

    // Notify participants
    for (const participant of session.participants) {
      this.ws.emitToUser(participant.userId, 'call_quality_updated', {
        sessionId,
        quality,
      })
    }
  }

  private getTimeRangeFilter(timeRange?: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date()
    switch (timeRange) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1))
      case 'week':
        return new Date(now.setDate(now.getDate() - 7))
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1))
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1))
      default:
        return new Date(now.setDate(now.getDate() - 7)) // Default to last week
    }
  }

  getActiveCall(sessionId: string): CallSession | undefined {
    return this.activeCalls.get(sessionId)
  }

  getActiveCalls(userId: string): CallSession[] {
    return Array.from(this.activeCalls.values()).filter((session) =>
      session.participants.some((p) => p.userId === userId)
    )
  }
}

let unifiedMessenger: UnifiedMessenger | null = null

export function getUnifiedMessenger(): UnifiedMessenger {
  if (!unifiedMessenger) {
    unifiedMessenger = new UnifiedMessenger()
  }
  return unifiedMessenger
} 