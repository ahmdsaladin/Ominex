import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Alert,
  Divider
} from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'

const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    me {
      id
      settings {
        id
        emailNotifications
        pushNotifications
        privacy
        language
        timezone
        theme
      }
    }
  }
`

const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($input: UpdateUserSettingsInput!) {
    updateSettings(input: $input) {
      id
      emailNotifications
      pushNotifications
      privacy
      language
      timezone
      theme
    }
  }
`

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' }
]

const timezones = [
  { code: 'UTC', name: 'UTC' },
  { code: 'EST', name: 'Eastern Time' },
  { code: 'CST', name: 'Central Time' },
  { code: 'MST', name: 'Mountain Time' },
  { code: 'PST', name: 'Pacific Time' }
]

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<any>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loading } = useQuery(GET_USER_SETTINGS, {
    onCompleted: (data) => {
      setSettings(data.me.settings)
    }
  })

  const [updateSettings] = useMutation(UPDATE_SETTINGS, {
    onCompleted: (data) => {
      setSettings(data.updateSettings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (error) => {
      setError(error.message)
      setTimeout(() => setError(null), 3000)
    }
  })

  const handleChange = (field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    try {
      await updateSettings({
        variables: {
          input: settings
        }
      })
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading settings...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings updated successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Privacy Settings" />
            <CardContent>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Profile Privacy</InputLabel>
                <Select
                  value={settings?.privacy || 'public'}
                  onChange={(e) => handleChange('privacy', e.target.value)}
                  label="Profile Privacy"
                >
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                  <MenuItem value="friends">Friends Only</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Notification Preferences" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.emailNotifications || false}
                    onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.pushNotifications || false}
                    onChange={(e) => handleChange('pushNotifications', e.target.checked)}
                  />
                }
                label="Push Notifications"
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Appearance & Language" />
            <CardContent>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings?.theme || 'light'}
                  onChange={(e) => {
                    handleChange('theme', e.target.value)
                    setTheme(e.target.value)
                  }}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings?.language || 'en'}
                  onChange={(e) => handleChange('language', e.target.value)}
                  label="Language"
                >
                  {languages.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={settings?.timezone || 'UTC'}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  label="Timezone"
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz.code} value={tz.code}>
                      {tz.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!settings}
            >
              Save Changes
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  )
} 