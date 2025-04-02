import React from 'react'
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material'
import { useContentRecommendations } from '../hooks/useContentRecommendations'
import { PostCard } from './PostCard'

export function RecommendedContent() {
  const {
    posts,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
  } = useContentRecommendations()

  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>
        {error.message}
      </Alert>
    )
  }

  if (loading && posts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (posts.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No recommended content yet. Start following creators to see personalized recommendations!
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Recommended for You
        </Typography>
        <Button onClick={refresh} variant="outlined" size="small">
          Refresh
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={3}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </Box>

      {loading && posts.length > 0 && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {hasMore && !loading && (
        <Box display="flex" justifyContent="center" p={2}>
          <Button onClick={loadMore} variant="outlined">
            Load More
          </Button>
        </Box>
      )}
    </Box>
  )
} 