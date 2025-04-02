import { realtime } from '../realtime'
import { prisma } from '../prisma'
import { env } from '../env'

export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
  userId: string
}

export class NotificationService {
  private static instance: NotificationService
  private webPushEnabled: boolean

  private constructor() {
    this.webPushEnabled = 'serviceWorker' in navigator && 'PushManager' in window
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async initialize() {
    if (this.webPushEnabled) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        const permission = await Notification.requestPermission()
        
        if (permission === 'granted') {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: env.VAPID_PUBLIC_KEY,
          })
          
          await this.savePushSubscription(subscription)
        }
      } catch (error) {
        console.error('Push notification initialization failed:', error)
      }
    }
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    try {
      const savedNotification = await prisma.notification.create({
        data: {
          ...notification,
          read: false,
        },
      })

      // Emit real-time notification
      realtime.emit('notification:new', savedNotification)

      // Send push notification
      await this.sendPushNotification(savedNotification)

      // Send email notification if enabled
      if (notification.type !== 'message') {
        await this.sendEmailNotification(savedNotification)
      }

      return savedNotification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })

      realtime.emit('notification:read', { id: notificationId })
      return notification
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async markAllAsRead(userId: string) {
    try {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })

      realtime.emit('notification:readAll', { userId })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  private async savePushSubscription(subscription: PushSubscription) {
    try {
      await prisma.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.getKey('p256dh')?.toString('base64') || '',
          auth: subscription.getKey('auth')?.toString('base64') || '',
        },
      })
    } catch (error) {
      console.error('Error saving push subscription:', error)
      throw error
    }
  }

  private async sendPushNotification(notification: Notification) {
    if (!this.webPushEnabled) return

    try {
      const subscription = await prisma.pushSubscription.findFirst()
      if (!subscription) return

      const response = await fetch('/api/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notification: {
            title: notification.title,
            body: notification.message,
            icon: '/icon.png',
            badge: '/badge.png',
            data: notification.data,
            vibrate: [100, 50, 100],
            actions: [
              {
                action: 'open',
                title: 'Open',
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
              },
            ],
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send push notification')
      }
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  private async sendEmailNotification(notification: Notification) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, emailNotifications: true },
      })

      if (!user?.email || !user.emailNotifications) return

      await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          subject: notification.title,
          text: notification.message,
          html: this.generateEmailHtml(notification),
        }),
      })
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  private generateEmailHtml(notification: Notification): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data ? `<p>${JSON.stringify(notification.data)}</p>` : ''}
        <p>
          <a href="${env.APP_URL}/notifications" style="
            display: inline-block;
            padding: 10px 20px;
            background-color: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 4px;
          ">View Notification</a>
        </p>
      </div>
    `
  }
}

export const notifications = NotificationService.getInstance() 