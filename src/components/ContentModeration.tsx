import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material'
import { Delete, Check, Close } from '@mui/icons-material'
import { ai } from '../lib/ai'

interface ContentModerationProps {
  onModerate: (content: string, isApproved: boolean) => void
}

export function ContentModeration({ onModerate }: ContentModerationProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [moderationResult, setModerationResult] = useState<{
    spam: boolean
    toxicity: number
    fakeNews: boolean
  } | null>(null)

  const handleModerate = async () => {
    if (!content.trim()) return

    try {
      setLoading(true)
      setError(null)

      const [spamResult, moderationResult, fakeNewsResult] = await Promise.all([
        ai.detectSpam(content),
        ai.moderateContent(content),
        ai.detectFakeNews(content),
      ])

      setModerationResult({
        spam: spamResult.isSpam,
        toxicity: moderationResult.toxicity,
        fakeNews: fakeNewsResult.isFakeNews,
      })
    } catch (error) {
      console.error('Error moderating content:', error)
      setError(error instanceof Error ? error : new Error('Failed to moderate content'))
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = () => {
    onModerate(content, true)
    setContent('')
    setModerationResult(null)
  }

  const handleReject = () => {
    onModerate(content, false)
    setContent('')
    setModerationResult(null)
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Content Moderation
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          label="Content to Moderate"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        />

        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button
            variant="contained"
            onClick={handleModerate}
            disabled={!content.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Moderate'}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {moderationResult && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Moderation Results
          </Typography>

          <List>
            <ListItem>
              <ListItemText
                primary="Spam Detection"
                secondary={moderationResult.spam ? 'Spam detected' : 'No spam detected'}
              />
              <ListItemSecondaryAction>
                <Chip
                  label={moderationResult.spam ? 'Spam' : 'Clean'}
                  color={moderationResult.spam ? 'error' : 'success'}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Toxicity Level"
                secondary={`${(moderationResult.toxicity * 100).toFixed(1)}%`}
              />
              <ListItemSecondaryAction>
                <Chip
                  label={moderationResult.toxicity > 0.7 ? 'High' : 'Low'}
                  color={moderationResult.toxicity > 0.7 ? 'error' : 'success'}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Fake News Detection"
                secondary={moderationResult.fakeNews ? 'Fake news detected' : 'No fake news detected'}
              />
              <ListItemSecondaryAction>
                <Chip
                  label={moderationResult.fakeNews ? 'Fake' : 'Real'}
                  color={moderationResult.fakeNews ? 'error' : 'success'}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Box display="flex" justifyContent="flex-end" mt={2} gap={1}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={handleReject}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Check />}
              onClick={handleApprove}
            >
              Approve
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  )
} 