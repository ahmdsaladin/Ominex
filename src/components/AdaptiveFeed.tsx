import React, { useEffect, useState } from 'react'
import { Box, Grid, List, Typography } from '@mui/material'
import { useUI } from '../contexts/UIContext'
import { useAI } from '../lib/ai'
import { useUser } from '../contexts/UserContext'
import { Post, Story } from '../types'
import { PostCard } from './PostCard'
import { StoryCard } from './StoryCard'
import { glassmorphismStyles, animationStyles } from '../styles/theme'

interface AdaptiveFeedProps {
  posts: Post[]
  stories: Story[]
}

export function AdaptiveFeed({ posts, stories }: AdaptiveFeedProps) {
  const { uiPreferences } = useUI()
  const { user } = useUser()
  const ai = useAI()
  const [optimizedContent, setOptimizedContent] = useState<{
    posts: Post[]
    stories: Story[]
    layout: 'grid' | 'list' | 'stories'
  }>({
    posts,
    stories,
    layout: uiPreferences.feedLayout,
  })

  useEffect(() => {
    if (!user) return

    const optimizeContent = async () => {
      try {
        // Get user engagement patterns
        const engagementPatterns = await ai.analyzeUserEngagement(user.id)

        // Get content recommendations
        const recommendations = await ai.getContentRecommendations({
          userId: user.id,
          posts,
          stories,
          engagementPatterns,
        })

        // Determine optimal layout based on user behavior
        const layout = determineOptimalLayout(engagementPatterns)

        setOptimizedContent({
          posts: recommendations.posts,
          stories: recommendations.stories,
          layout,
        })

        // Update UI preferences if layout has changed
        if (layout !== uiPreferences.feedLayout) {
          await ai.updateUserPreferences(user.id, {
            uiPreferences: {
              ...uiPreferences,
              feedLayout: layout,
            },
          })
        }
      } catch (error) {
        console.error('Content optimization error:', error)
      }
    }

    optimizeContent()
  }, [user, posts, stories, ai, uiPreferences])

  const determineOptimalLayout = (patterns: any) => {
    const { storyEngagement, postEngagement, timeSpent } = patterns

    // Calculate engagement ratios
    const storyRatio = storyEngagement / (storyEngagement + postEngagement)
    const postRatio = postEngagement / (storyEngagement + postEngagement)

    // Determine layout based on engagement patterns
    if (storyRatio > 0.6) {
      return 'stories'
    } else if (postRatio > 0.7) {
      return 'grid'
    } else {
      return 'list'
    }
  }

  const renderContent = () => {
    switch (optimizedContent.layout) {
      case 'stories':
        return (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, ...glassmorphismStyles }}>
              Stories
            </Typography>
            <Grid container spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
              {optimizedContent.stories.map(story => (
                <Grid item key={story.id}>
                  <StoryCard story={story} />
                </Grid>
              ))}
            </Grid>
            <Typography variant="h6" sx={{ mt: 4, mb: 2, ...glassmorphismStyles }}>
              Posts
            </Typography>
            <List>
              {optimizedContent.posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </List>
          </Box>
        )

      case 'grid':
        return (
          <Grid container spacing={3}>
            {optimizedContent.posts.map(post => (
              <Grid item xs={12} sm={6} md={4} key={post.id}>
                <PostCard post={post} />
              </Grid>
            ))}
          </Grid>
        )

      case 'list':
      default:
        return (
          <List>
            {optimizedContent.posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </List>
        )
    }
  }

  return (
    <Box
      sx={{
        ...glassmorphismStyles,
        p: 3,
        borderRadius: 2,
        transition: 'all 0.3s ease-in-out',
        ...animationStyles.hover,
      }}
    >
      {renderContent()}
    </Box>
  )
} 