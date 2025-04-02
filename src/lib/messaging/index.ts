import { realtime } from '../realtime'
import { prisma } from '../prisma'
import { crypto } from '../crypto'
import { notifications } from '../notifications'

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  encryptedContent: string
  read: boolean
  createdAt: Date
}

export class MessagingService {
  private static instance: MessagingService
  private encryptionKey: CryptoKey | null = null

  private constructor() {
    this.initializeEncryption()
  }

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService()
    }
    return MessagingService.instance
  }

  private async initializeEncryption() {
    try {
      this.encryptionKey = await crypto.generateKey()
    } catch (error) {
      console.error('Failed to initialize encryption:', error)
    }
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized')
    }

    try {
      // Encrypt message content
      const encryptedContent = await crypto.encrypt(content, this.encryptionKey)

      // Save message to database
      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
          encryptedContent,
          read: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      })

      // Emit real-time message
      realtime.emit('message:new', message)

      // Create notification for receiver
      await notifications.createNotification({
        type: 'message',
        title: 'New Message',
        message: `New message from ${message.sender.name}`,
        data: {
          messageId: message.id,
          senderId: message.sender.id,
          senderName: message.sender.name,
          senderAvatar: message.sender.avatar,
        },
        userId: receiverId,
      })

      return message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async getConversation(userId1: string, userId2: string) {
    try {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      return messages
    } catch (error) {
      console.error('Error getting conversation:', error)
      throw error
    }
  }

  async markAsRead(messageId: string) {
    try {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { read: true },
      })

      realtime.emit('message:read', { id: messageId })
      return message
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.message.count({
        where: {
          receiverId: userId,
          read: false,
        },
      })

      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw error
    }
  }

  async getConversations(userId: string) {
    try {
      const conversations = await prisma.message.groupBy({
        by: ['senderId', 'receiverId'],
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        _max: {
          createdAt: true,
        },
        _count: {
          _all: true,
        },
      })

      const conversationDetails = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.senderId === userId ? conv.receiverId : conv.senderId
          const user = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          })

          return {
            userId: otherUserId,
            userName: user?.name,
            userAvatar: user?.avatar,
            lastMessage: conv._max.createdAt,
            unreadCount: conv._count._all,
          }
        })
      )

      return conversationDetails
    } catch (error) {
      console.error('Error getting conversations:', error)
      throw error
    }
  }
}

export const messaging = MessagingService.getInstance() 