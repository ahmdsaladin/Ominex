import React, { useState } from 'react'
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
  IconButton,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Badge,
  Divider
} from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'
import { formatDistanceToNow } from 'date-fns'

const GET_NOTIFICATIONS = gql`
  query GetNotifications($first: Int, $after: String, $read: Boolean) {
    notifications(first: $first, after: $after, read: $read) {
      edges {
        cursor
        node {
          id
          type
          data
          read
          createdAt
          user {
            id
            name
            avatar
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const MARK_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      read
    }
  }
`

const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`

const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id)
  }
`

const NEW_NOTIFICATION_SUBSCRIPTION = gql`
  subscription OnNewNotification {
    newNotification {
      id
      type
      data
      read
      createdAt
      user {
        id
        name
        avatar
      }
    }
  }
`

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export const Notifications: React.FC = () => {
  const { theme } = useTheme()
  const [tabValue, setTabValue] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data, fetchMore, loading: loadingMore } = useQuery(GET_NOTIFICATIONS, {
    variables: { first: 20 },
    onCompleted: (data) => {
      setNotifications(data.notifications.edges.map((edge: any) => edge.node))
      setLoading(false)
    },
    onError: (error) => {
      setError(error.message)
      setLoading(false)
    }
  })

  const [markAsRead] = useMutation(MARK_AS_READ)
  const [markAllRead] = useMutation(MARK_ALL_READ)
  const [deleteNotification] = useMutation(DELETE_NOTIFICATION)

  // Subscribe to new notifications
  useSubscription(NEW_NOTIFICATION_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData }) => {
      const newNotification = subscriptionData.data.newNotification
      setNotifications((prev) => [newNotification, ...prev])
    }
  })

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead({ variables: { id } })
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification({ variables: { id } })
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      )
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationContent = (notification: any) => {
    switch (notification.type) {
      case 'like':
        return `${notification.data.userName} liked your post`
      case 'comment':
        return `${notification.data.userName} commented on your post`
      case 'follow':
        return `${notification.data.userName} started following you`
      case 'mention':
        return `${notification.data.userName} mentioned you in a post`
      default:
        return 'New notification'
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

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Notifications</Typography>
        {unreadCount > 0 && (
          <Button
            variant="outlined"
            color="primary"
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        )}
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label={
                <Badge badgeContent={unreadCount} color="primary">
                  All
                </Badge>
              }
            />
            <Tab label="Unread" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  bgcolor: notification.read ? 'transparent' : 'action.hover'
                }}
              >
                <Avatar
                  src={notification.user.avatar}
                  sx={{ mr: 2 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">
                    {getNotificationContent(notification)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true
                    })}
                  </Typography>
                </Box>
                <Box>
                  {!notification.read && (
                    <IconButton
                      size="small"
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{ mr: 1 }}
                    >
                      ✓
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(notification.id)}
                  >
                    ×
                  </IconButton>
                </Box>
              </Box>
              <Divider />
            </React.Fragment>
          ))}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {notifications
            .filter((notification) => !notification.read)
            .map((notification) => (
              <React.Fragment key={notification.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Avatar
                    src={notification.user.avatar}
                    sx={{ mr: 2 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">
                      {getNotificationContent(notification)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true
                      })}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{ mr: 1 }}
                    >
                      ✓
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(notification.id)}
                    >
                      ×
                    </IconButton>
                  </Box>
                </Box>
                <Divider />
              </React.Fragment>
            ))}
        </TabPanel>
      </Card>
    </Container>
  )
} 