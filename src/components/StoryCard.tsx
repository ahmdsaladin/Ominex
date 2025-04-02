import React, { useState, useEffect } from 'react'
import {
  Card,
  CardMedia,
  Box,
  Typography,
  Avatar,
  IconButton,
  useTheme,
} from '@mui/material'
import {
  Add,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
} from '@mui/icons-material'
import { Story } from '../types'
import { glassmorphismStyles, neonStyles, animationStyles } from '../styles/theme'
import { useUI } from '../contexts/UIContext'

interface StoryCardProps {
  story: Story
}

export function StoryCard({ story }: StoryCardProps) {
  const theme = useTheme()
  const { uiPreferences } = useUI()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const now = new Date()
    const expiryDate = new Date(story.expiresAt)
    setIsExpired(now > expiryDate)

    if (isPlaying && !isExpired) {
      const duration = 5000 // 5 seconds per story
      const interval = 50 // Update every 50ms
      const steps = duration / interval
      const increment = 100 / steps

      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            setIsPlaying(false)
            return 100
          }
          return prev + increment
        })
      }, interval)

      return () => clearInterval(timer)
    }
  }, [isPlaying, story.expiresAt, isExpired])

  const handlePlayPause = () => {
    if (isExpired) return
    setIsPlaying(!isPlaying)
  }

  const handleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleAddStory = () => {
    // TODO: Implement add story functionality
  }

  const renderMedia = () => {
    if (!story.media?.length) return null

    const media = story.media[0]
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 1,
        }}
      >
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt={story.content}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <video
            src={media.url}
            muted={isMuted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </Box>
    )
  }

  return (
    <Card
      sx={{
        width: 120,
        height: 200,
        position: 'relative',
        cursor: isExpired ? 'default' : 'pointer',
        ...glassmorphismStyles,
        transition: 'all 0.3s ease-in-out',
        ...animationStyles.hover,
        opacity: isExpired ? 0.7 : 1,
      }}
      onClick={handlePlayPause}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          bgcolor: 'rgba(255, 255, 255, 0.3)',
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            height: '100%',
            bgcolor: theme.palette.primary.main,
            width: `${progress}%`,
            transition: 'width 0.05s linear',
            ...neonStyles.boxShadow,
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Avatar
          src={story.author?.avatar}
          sx={{
            width: 32,
            height: 32,
            border: `2px solid ${theme.palette.primary.main}`,
            ...neonStyles.boxShadow,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: 'white',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
          }}
        >
          {story.author?.username}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          display: 'flex',
          gap: 1,
        }}
      >
        {story.media[0]?.type === 'video' && (
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation()
              handleMute()
            }}
            sx={{
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            {isMuted ? (
              <VolumeOff sx={{ color: 'white' }} />
            ) : (
              <VolumeUp sx={{ color: 'white' }} />
            )}
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={e => {
            e.stopPropagation()
            handleAddStory()
          }}
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <Add sx={{ color: 'white' }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          zIndex: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'white',
            textShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.content}
        </Typography>
      </Box>

      {!isExpired && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            ...animationStyles.pulse,
          }}
        >
          {isPlaying ? (
            <Pause sx={{ fontSize: 48, color: 'white' }} />
          ) : (
            <PlayArrow sx={{ fontSize: 48, color: 'white' }} />
          )}
        </Box>
      )}

      {renderMedia()}
    </Card>
  )
} 