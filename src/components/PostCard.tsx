import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
  Collapse,
  useTheme,
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  Comment,
  Share,
  MoreVert,
  LocationOn,
  AccessTime,
  ExpandMore,
} from '@mui/icons-material'
import { Post } from '../types'
import { glassmorphismStyles, neonStyles, animationStyles } from '../styles/theme'
import { useUI } from '../contexts/UIContext'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const theme = useTheme()
  const { uiPreferences } = useUI()
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(false)

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleLike = () => {
    setLiked(!liked)
    // TODO: Implement like functionality
  }

  const handleShare = () => {
    // TODO: Implement share functionality
  }

  const handleComment = () => {
    // TODO: Implement comment functionality
  }

  const handleMore = () => {
    // TODO: Implement more options menu
  }

  const renderMedia = () => {
    if (!post.media?.length) return null

    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: post.media.length > 1 ? '300px' : '400px',
          overflow: 'hidden',
          borderRadius: 1,
          mb: 2,
          ...glassmorphismStyles,
        }}
      >
        {post.media[0].type === 'image' ? (
          <img
            src={post.media[0].url}
            alt={post.content}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <video
            src={post.media[0].url}
            controls
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {post.media.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              gap: 1,
            }}
          >
            {post.media.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                  ...animationStyles.pulse,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Card
      sx={{
        mb: 2,
        ...glassmorphismStyles,
        transition: 'all 0.3s ease-in-out',
        ...animationStyles.hover,
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            src={post.author?.avatar}
            sx={{
              border: `2px solid ${theme.palette.primary.main}`,
              ...neonStyles.boxShadow,
            }}
          />
        }
        action={
          <IconButton onClick={handleMore}>
            <MoreVert />
          </IconButton>
        }
        title={
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 'bold',
              ...neonStyles.textShadow,
            }}
          >
            {post.author?.username}
          </Typography>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime sx={{ fontSize: 16 }} />
            <Typography variant="caption">
              {new Date(post.createdAt).toLocaleDateString()}
            </Typography>
            {post.location && (
              <>
                <LocationOn sx={{ fontSize: 16 }} />
                <Typography variant="caption">{post.location.name}</Typography>
              </>
            )}
          </Box>
        }
      />
      <CardContent>
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            ...(uiPreferences.animations && animationStyles.glow),
          }}
        >
          {post.content}
        </Typography>
        {renderMedia()}
        {post.tags && post.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {post.tags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  ...glassmorphismStyles,
                  ...neonStyles.boxShadow,
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
      <CardActions disableSpacing>
        <IconButton onClick={handleLike}>
          {liked ? (
            <Favorite color="error" sx={{ ...neonStyles.textShadow }} />
          ) : (
            <FavoriteBorder />
          )}
        </IconButton>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {post.likes}
        </Typography>
        <IconButton onClick={handleComment}>
          <Comment />
        </IconButton>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {post.comments}
        </Typography>
        <IconButton onClick={handleShare}>
          <Share />
        </IconButton>
        <Typography variant="body2" sx={{ mr: 2 }}>
          {post.shares}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={handleExpandClick}
          sx={{
            transform: !expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s',
          }}
        >
          <ExpandMore />
        </IconButton>
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {post.content}
          </Typography>
        </CardContent>
      </Collapse>
    </Card>
  )
} 