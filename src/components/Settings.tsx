import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  useTheme,
} from '@mui/material'
import {
  DarkMode,
  LightMode,
  Palette,
  TextFields,
  Animation,
  Speed,
  GridView,
  List,
  AutoStories,
  Notifications,
  Security,
  PrivacyTip,
  Blockchain,
  Fingerprint,
} from '@mui/icons-material'
import { useUIPreferences } from '../hooks/useUIPreferences'
import { glassmorphismStyles, neonStyles, animationStyles } from '../styles/theme'

export function Settings() {
  const theme = useTheme()
  const {
    preferences,
    isLoading,
    toggleTheme,
    toggleFontSize,
    toggleAnimations,
    toggleReducedMotion,
    toggleFeedLayout,
    toggleNotification,
    togglePrivacySetting,
    adaptToUserBehavior,
  } = useUIPreferences()

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading settings...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 4,
          ...glassmorphismStyles,
          ...neonStyles.textShadow,
        }}
      >
        Settings
      </Typography>

      {/* Appearance Settings */}
      <Card
        sx={{
          mb: 3,
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Palette />
            Appearance
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Theme</Typography>
            <Button
              variant="outlined"
              onClick={toggleTheme}
              startIcon={
                preferences.theme === 'dark' ? <DarkMode /> : <LightMode />
              }
              sx={{
                ...glassmorphismStyles,
                ...neonStyles.boxShadow,
              }}
            >
              {preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1)}
            </Button>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Font Size</Typography>
            <Button
              variant="outlined"
              onClick={toggleFontSize}
              startIcon={<TextFields />}
              sx={{
                ...glassmorphismStyles,
                ...neonStyles.boxShadow,
              }}
            >
              {preferences.fontSize.charAt(0).toUpperCase() + preferences.fontSize.slice(1)}
            </Button>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={preferences.animations}
                onChange={toggleAnimations}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Animation />
                <Typography>Enable Animations</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.reducedMotion}
                onChange={toggleReducedMotion}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed />
                <Typography>Reduce Motion</Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* Feed Settings */}
      <Card
        sx={{
          mb: 3,
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {preferences.feedLayout === 'grid' ? (
              <GridView />
            ) : preferences.feedLayout === 'list' ? (
              <List />
            ) : (
              <AutoStories />
            )}
            Feed Layout
          </Typography>

          <Button
            variant="outlined"
            onClick={toggleFeedLayout}
            sx={{
              ...glassmorphismStyles,
              ...neonStyles.boxShadow,
            }}
          >
            {preferences.feedLayout.charAt(0).toUpperCase() + preferences.feedLayout.slice(1)}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card
        sx={{
          mb: 3,
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Notifications />
            Notifications
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={preferences.notifications.email}
                onChange={() => toggleNotification('email')}
                color="primary"
              />
            }
            label="Email Notifications"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.notifications.push}
                onChange={() => toggleNotification('push')}
                color="primary"
              />
            }
            label="Push Notifications"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.notifications.inApp}
                onChange={() => toggleNotification('inApp')}
                color="primary"
              />
            }
            label="In-App Notifications"
          />
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card
        sx={{
          mb: 3,
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Security />
            Privacy
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={preferences.privacy.anonymousMode}
                onChange={() => togglePrivacySetting('anonymousMode')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PrivacyTip />
                <Typography>Anonymous Mode</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.privacy.dataSharing}
                onChange={() => togglePrivacySetting('dataSharing')}
                color="primary"
              />
            }
            label="Data Sharing"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.privacy.blockchainControl}
                onChange={() => togglePrivacySetting('blockchainControl')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Blockchain />
                <Typography>Blockchain Control</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.privacy.biometricAuth}
                onChange={() => togglePrivacySetting('biometricAuth')}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Fingerprint />
                <Typography>Biometric Authentication</Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      {/* AI Adaptation */}
      <Card
        sx={{
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Palette />
            AI-Driven UI Adaptation
          </Typography>

          <Typography variant="body2" sx={{ mb: 2 }}>
            Let the AI analyze your usage patterns and automatically adjust the UI to your preferences.
          </Typography>

          <Button
            variant="contained"
            onClick={adaptToUserBehavior}
            sx={{
              ...glassmorphismStyles,
              ...neonStyles.boxShadow,
            }}
          >
            Adapt UI to My Behavior
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
} 