import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Badge,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Send,
  AttachFile,
  EmojiEmotions,
  Image,
  Videocam,
} from '@mui/icons-material'
import { messaging } from '../lib/messaging'
import { useAuth } from '../hooks/useAuth'
import { realtime } from '../lib/realtime'

interface ChatProps {
  receiverId: string
  receiverName: string
  receiverAvatar?: string
}

export function Chat({ receiverId, receiverName, receiverAvatar }: ChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    // Load initial messages
    loadMessages()

    // Subscribe to real-time updates
    const messageHandler = (message: any) => {
      if (
        (message.senderId === receiverId && message.receiverId === user.id) ||
        (message.senderId === user.id && message.receiverId === receiverId)
      ) {
        setMessages((prev) => [...prev, message])
      }
    }

    const readHandler = ({ id }: { id: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, read: true } : msg
        )
      )
    }

    realtime.on('message:new', messageHandler)
    realtime.on('message:read', readHandler)

    return () => {
      realtime.off('message:new', messageHandler)
      realtime.off('message:read', readHandler)
    }
  }, [user, receiverId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const conversation = await messaging.getConversation(user.id, receiverId)
      setMessages(conversation)

      // Mark messages as read
      const unreadMessages = conversation.filter(
        (msg) => !msg.read && msg.receiverId === user.id
      )
      await Promise.all(
        unreadMessages.map((msg) => messaging.markAsRead(msg.id))
      )
    } catch (error) {
      console.error('Error loading messages:', error)
      setError(error instanceof Error ? error : new Error('Failed to load messages'))
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return

    try {
      setError(null)
      await messaging.sendMessage(user.id, receiverId, newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error : new Error('Failed to send message'))
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    )
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            color="success"
          >
            <Avatar src={receiverAvatar} alt={receiverName}>
              {receiverName[0]}
            </Avatar>
          </Badge>
          <Typography variant="h6">{receiverName}</Typography>
        </Box>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  bgcolor: message.senderId === user?.id ? 'primary.main' : 'grey.100',
                  color: message.senderId === user?.id ? 'white' : 'text.primary',
                  borderRadius: 2,
                  p: 1.5,
                  position: 'relative',
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'right',
                    mt: 0.5,
                    opacity: 0.7,
                  }}
                >
                  {new Date(message.createdAt).toLocaleTimeString()}
                </Typography>
                {message.senderId === user?.id && (
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: -16,
                      right: 0,
                      opacity: 0.7,
                    }}
                  >
                    {message.read ? 'Read' : 'Sent'}
                  </Typography>
                )}
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={1}>
          <IconButton size="small">
            <AttachFile />
          </IconButton>
          <IconButton size="small">
            <Image />
          </IconButton>
          <IconButton size="small">
            <Videocam />
          </IconButton>
          <IconButton size="small">
            <EmojiEmotions />
          </IconButton>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            variant="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  )
} 