import { io, Socket } from 'socket.io-client'
import { env } from '../env'

export interface RealtimeEvent {
  type: 'post' | 'comment' | 'like' | 'subscription' | 'payment'
  data: any
  timestamp: number
}

export class RealtimeService {
  private static instance: RealtimeService
  private socket: Socket | null = null
  private eventHandlers: Map<string, Set<(event: RealtimeEvent) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  private constructor() {
    this.initializeSocket()
  }

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  private initializeSocket() {
    this.socket = io(env.WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.handleReconnect()
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.handleReconnect()
    })

    this.socket.on('event', (event: RealtimeEvent) => {
      this.handleEvent(event)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        this.initializeSocket()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  private handleEvent(event: RealtimeEvent) {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  subscribe(eventType: string, handler: (event: RealtimeEvent) => void) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)

    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType)
        }
      }
    }
  }

  emit(event: RealtimeEvent) {
    if (this.socket?.connected) {
      this.socket.emit('event', event)
    }
  }

  joinRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join', roomId)
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave', roomId)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export const realtime = RealtimeService.getInstance() 