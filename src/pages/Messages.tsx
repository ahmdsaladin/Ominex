import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Paper
} from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'
import { formatDistanceToNow } from 'date-fns'
import { encryptMessage, decryptMessage } from '../lib/crypto'

const GET_CONVERSATIONS = gql`
  query GetConversations {
    conversations {
      id
      participants {
        id
        name
        avatar
      }
      lastMessage {
        id
        content
        createdAt
        sender {
          id
          name
        }
      }
      unreadCount
    }
  }
`

const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!) {
    messages(conversationId: $conversationId) {
      id
      content
      createdAt
      sender {
        id
        name
        avatar
      }
      read
    }
  }
`

const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $content: String!) {
    sendMessage(conversationId: $conversationId, content: $content) {
      id
      content
      createdAt
      sender {
        id
        name
        avatar
      }
      read
    }
  }
`

const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription OnNewMessage($conversationId: ID!) {
    newMessage(conversationId: $conversationId) {
      id
      content
      createdAt
      sender {
        id
        name
        avatar
      }
      read
    }
  }
`

export const Messages: React.FC = () => {
  const { theme } = useTheme()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversationsData } = useQuery(GET_CONVERSATIONS, {
    onCompleted: (data) => {
      setConversations(data.conversations)
      setLoading(false)
    },
    onError: (error) => {
      setError(error.message)
      setLoading(false)
    }
  })

  const { data: messagesData } = useQuery(GET_MESSAGES, {
    variables: { conversationId: selectedConversation?.id },
    skip: !selectedConversation,
    onCompleted: (data) => {
      setMessages(data.messages)
      scrollToBottom()
    }
  })

  const [sendMessage] = useMutation(SEND_MESSAGE)

  // Subscribe to new messages
  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
    variables: { conversationId: selectedConversation?.id },
    skip: !selectedConversation,
    onSubscriptionData: ({ subscriptionData }) => {
      const newMessage = subscriptionData.data.newMessage
      setMessages((prev) => [...prev, newMessage])
      scrollToBottom()
    }
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const encryptedContent = await encryptMessage(newMessage)
      await sendMessage({
        variables: {
          conversationId: selectedConversation.id,
          content: encryptedContent
        }
      })
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversations
              </Typography>
              <List>
                {conversations.map((conversation) => (
                  <React.Fragment key={conversation.id}>
                    <ListItem
                      button
                      selected={selectedConversation?.id === conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <ListItemAvatar>
                        <Badge
                          color="primary"
                          variant="dot"
                          invisible={conversation.unreadCount === 0}
                        >
                          <Avatar src={conversation.participants[0].avatar} />
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={conversation.participants[0].name}
                        secondary={
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {conversation.lastMessage.content}
                          </Typography>
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessage.createdAt),
                          { addSuffix: true }
                        )}
                      </Typography>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedConversation ? (
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    pb: 2,
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}
                >
                  <Avatar
                    src={selectedConversation.participants[0].avatar}
                    sx={{ mr: 2 }}
                  />
                  <Typography variant="h6">
                    {selectedConversation.participants[0].name}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    height: '60vh',
                    overflowY: 'auto',
                    mb: 2
                  }}
                >
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent:
                          message.sender.id === 'current-user'
                            ? 'flex-end'
                            : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor:
                            message.sender.id === 'current-user'
                              ? 'primary.main'
                              : 'grey.100',
                          color:
                            message.sender.id === 'current-user'
                              ? 'primary.contrastText'
                              : 'text.primary'
                        }}
                      >
                        <Typography variant="body1">
                          {decryptMessage(message.content)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            opacity: 0.7
                          }}
                        >
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true
                          })}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="text.secondary">
                  Select a conversation to start messaging
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  )
} 