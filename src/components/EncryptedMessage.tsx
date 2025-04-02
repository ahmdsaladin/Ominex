import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Send as SendIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { auth } from '../lib/auth'

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: Date
  isEncrypted: boolean
}

interface EncryptedMessageProps {
  receiverId: string
  onMessageSent?: (message: Message) => void
}

export function EncryptedMessage({ receiverId, onMessageSent }: EncryptedMessageProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEncrypted, setIsEncrypted] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [message])

  const handleSend = async () => {
    if (!message.trim() || !user) return

    try {
      setLoading(true)
      setError(null)

      let encryptedContent = message
      if (isEncrypted) {
        encryptedContent = await auth.encryptMessage(
          user.id,
          receiverId,
          message
        )
      }

      // Send message to server
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId,
          content: encryptedContent,
          isEncrypted,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const newMessage = await response.json()

      // Clear input
      setMessage('')

      // Notify parent
      onMessageSent?.(newMessage)
    } catch (error) {
      console.error('Message sending error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1">Messages</Typography>
        <Tooltip title={isEncrypted ? 'End-to-end encrypted' : 'Unencrypted'}>
          <IconButton
            size="small"
            onClick={() => setIsEncrypted(!isEncrypted)}
            color={isEncrypted ? 'primary' : 'default'}
          >
            {isEncrypted ? <LockIcon /> : <LockOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2 }}>
          {error}
        </Alert>
      )}

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
        {/* Messages will be rendered here */}
        <div ref={messagesEndRef} />
      </Box>

      <Paper
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={loading}
          InputProps={{
            endAdornment: isEncrypted && (
              <LockIcon color="primary" sx={{ mr: 1 }} />
            ),
          }}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !message.trim()}
        >
          {loading ? <CircularProgress size={24} /> : <SendIcon />}
        </Button>
      </Paper>
    </Box>
  )
} 