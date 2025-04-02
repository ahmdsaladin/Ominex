import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Badge,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Delete,
  Check,
} from '@mui/icons-material'
import { notifications } from '../lib/notifications'
import { useAuth } from '../hooks/useAuth'
import { realtime } from '../lib/realtime'

export function Notifications() {
  const { user } = useAuth()
  const [notificationList, setNotificationList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    // Load initial notifications
    loadNotifications()

    // Subscribe to real-time updates
    const newNotificationHandler = (notification: any) => {
      setNotificationList((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    }

    const readNotificationHandler = ({ id }: { id: string }) => {
      setNotificationList((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    realtime.on('notification:new', newNotificationHandler)
    realtime.on('notification:read', readNotificationHandler)

    return () => {
      realtime.off('notification:new', newNotificationHandler)
      realtime.off('notification:read', readNotificationHandler)
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Failed to load notifications')

      const data = await response.json()
      setNotificationList(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Error loading notifications:', error)
      setError(error instanceof Error ? error : new Error('Failed to load notifications'))
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      notifications.markAsRead(notification.id)
    }

    // Handle notification action based on type
    switch (notification.type) {
      case 'message':
        // Navigate to chat
        window.location.href = `/chat/${notification.data.senderId}`
        break
      case 'mention':
        // Navigate to post
        window.location.href = `/post/${notification.data.postId}`
        break
      case 'follow':
        // Navigate to profile
        window.location.href = `/profile/${notification.data.userId}`
        break
      default:
        // Handle other notification types
        break
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await notifications.markAllAsRead(user.id)
      setNotificationList((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      setError(error instanceof Error ? error : new Error('Failed to mark notifications as read'))
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      setNotificationList((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error deleting notification:', error)
      setError(error instanceof Error ? error : new Error('Failed to delete notification'))
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    )
  }

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 360,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            <IconButton size="small" onClick={handleMarkAllAsRead}>
              <Check />
            </IconButton>
            <IconButton size="small" onClick={loadNotifications}>
              <NotificationsActive />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : notificationList.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="textSecondary">No notifications</Typography>
          </Box>
        ) : (
          <List>
            {notificationList.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'inherit' : 'action.hover',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={notification.data?.userAvatar}>
                      {notification.data?.userName?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <Box>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNotification(notification.id)
                    }}
                  >
                    <Delete />
                  </IconButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
} 