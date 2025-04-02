import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  TrendingUp,
  People,
  Timer,
  EmojiEvents,
  TrendingDown,
} from '@mui/icons-material'
import { ai } from '../lib/ai'
import { useAuth } from '../hooks/useAuth'

interface AnalyticsData {
  engagement: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  audience: {
    followers: number
    activeUsers: number
    peakHours: string[]
  }
  performance: {
    topPosts: Array<{
      id: string
      title: string
      engagement: number
    }>
    growth: number
  }
  recommendations: {
    bestTimeToPost: string
    contentSuggestions: string[]
    audienceInsights: string[]
  }
}

export function ContentAnalytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        const data = await ai.getAnalytics(user.id)
        setAnalytics(data)
      } catch (error) {
        console.error('Error loading analytics:', error)
        setError(error instanceof Error ? error : new Error('Failed to load analytics'))
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user])

  if (error) {
    return (
      <Alert severity="error">
        {error.message}
      </Alert>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available yet.
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Content Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Engagement Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Engagement Metrics
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <TrendingUp color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Total Views"
                  secondary={analytics.engagement.views.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <People color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Likes"
                  secondary={analytics.engagement.likes.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Timer color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Comments"
                  secondary={analytics.engagement.comments.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EmojiEvents color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Shares"
                  secondary={analytics.engagement.shares.toLocaleString()}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Audience Insights */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Audience Insights
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <People color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Followers"
                  secondary={analytics.audience.followers.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Timer color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Active Users"
                  secondary={analytics.audience.activeUsers.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TrendingUp color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Peak Hours"
                  secondary={analytics.audience.peakHours.join(', ')}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Performance Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Analysis
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <TrendingUp color={analytics.performance.growth >= 0 ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary="Growth Rate"
                  secondary={`${analytics.performance.growth.toFixed(1)}%`}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Top Performing Posts"
                  secondary={
                    <List>
                      {analytics.performance.topPosts.map((post) => (
                        <ListItem key={post.id}>
                          <ListItemText
                            primary={post.title}
                            secondary={`Engagement: ${post.engagement.toLocaleString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  }
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* AI Recommendations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI Recommendations
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Timer color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Best Time to Post"
                  secondary={analytics.recommendations.bestTimeToPost}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Content Suggestions"
                  secondary={
                    <List>
                      {analytics.recommendations.contentSuggestions.map((suggestion, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={suggestion} />
                        </ListItem>
                      ))}
                    </List>
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Audience Insights"
                  secondary={
                    <List>
                      {analytics.recommendations.audienceInsights.map((insight, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={insight} />
                        </ListItem>
                      ))}
                    </List>
                  }
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
} 