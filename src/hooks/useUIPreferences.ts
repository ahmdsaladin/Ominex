import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import { useAI } from '../lib/ai'
import { UserPreferences } from '../types'

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 'medium',
  animations: true,
  reducedMotion: false,
  feedLayout: 'grid',
  notifications: {
    email: true,
    push: true,
    inApp: true,
  },
  privacy: {
    anonymousMode: false,
    dataSharing: true,
    blockchainControl: false,
    biometricAuth: false,
  },
}

export function useUIPreferences() {
  const { user } = useUser()
  const ai = useAI()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadPreferences()
    } else {
      setPreferences(DEFAULT_PREFERENCES)
      setIsLoading(false)
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const userPreferences = await ai.getUserPreferences(user!.id)
      setPreferences(userPreferences || DEFAULT_PREFERENCES)
    } catch (error) {
      console.error('Error loading UI preferences:', error)
      setPreferences(DEFAULT_PREFERENCES)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = useCallback(
    async (newPreferences: Partial<UserPreferences>) => {
      try {
        const updatedPreferences = {
          ...preferences,
          ...newPreferences,
        }
        setPreferences(updatedPreferences)

        if (user) {
          await ai.updateUserPreferences(user.id, updatedPreferences)
        }
      } catch (error) {
        console.error('Error updating UI preferences:', error)
      }
    },
    [preferences, user, ai]
  )

  const toggleTheme = useCallback(async () => {
    const themes: UserPreferences['theme'][] = ['light', 'dark', 'cyberpunk']
    const currentIndex = themes.indexOf(preferences.theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    await updatePreferences({ theme: nextTheme })
  }, [preferences.theme, updatePreferences])

  const toggleFontSize = useCallback(async () => {
    const sizes: UserPreferences['fontSize'][] = ['small', 'medium', 'large']
    const currentIndex = sizes.indexOf(preferences.fontSize)
    const nextSize = sizes[(currentIndex + 1) % sizes.length]
    await updatePreferences({ fontSize: nextSize })
  }, [preferences.fontSize, updatePreferences])

  const toggleAnimations = useCallback(async () => {
    await updatePreferences({ animations: !preferences.animations })
  }, [preferences.animations, updatePreferences])

  const toggleReducedMotion = useCallback(async () => {
    await updatePreferences({ reducedMotion: !preferences.reducedMotion })
  }, [preferences.reducedMotion, updatePreferences])

  const toggleFeedLayout = useCallback(async () => {
    const layouts: UserPreferences['feedLayout'][] = ['grid', 'list', 'stories']
    const currentIndex = layouts.indexOf(preferences.feedLayout)
    const nextLayout = layouts[(currentIndex + 1) % layouts.length]
    await updatePreferences({ feedLayout: nextLayout })
  }, [preferences.feedLayout, updatePreferences])

  const toggleNotification = useCallback(
    async (type: keyof UserPreferences['notifications']) => {
      await updatePreferences({
        notifications: {
          ...preferences.notifications,
          [type]: !preferences.notifications[type],
        },
      })
    },
    [preferences.notifications, updatePreferences]
  )

  const togglePrivacySetting = useCallback(
    async (setting: keyof UserPreferences['privacy']) => {
      await updatePreferences({
        privacy: {
          ...preferences.privacy,
          [setting]: !preferences.privacy[setting],
        },
      })
    },
    [preferences.privacy, updatePreferences]
  )

  const adaptToUserBehavior = useCallback(async () => {
    if (!user) return

    try {
      // Get user engagement patterns
      const engagementPatterns = await ai.analyzeUserEngagement(user.id)

      // Analyze patterns and suggest UI adaptations
      const suggestions = await ai.getUISuggestions(engagementPatterns)

      // Apply suggested changes
      if (suggestions.length > 0) {
        const updates = suggestions.reduce((acc, suggestion) => {
          switch (suggestion.type) {
            case 'theme':
              if (suggestion.value !== preferences.theme) {
                acc.theme = suggestion.value
              }
              break
            case 'fontSize':
              if (suggestion.value !== preferences.fontSize) {
                acc.fontSize = suggestion.value
              }
              break
            case 'feedLayout':
              if (suggestion.value !== preferences.feedLayout) {
                acc.feedLayout = suggestion.value
              }
              break
            case 'animations':
              if (suggestion.value !== preferences.animations) {
                acc.animations = suggestion.value
              }
              break
            case 'reducedMotion':
              if (suggestion.value !== preferences.reducedMotion) {
                acc.reducedMotion = suggestion.value
              }
              break
          }
          return acc
        }, {} as Partial<UserPreferences>)

        if (Object.keys(updates).length > 0) {
          await updatePreferences(updates)
        }
      }
    } catch (error) {
      console.error('Error adapting UI to user behavior:', error)
    }
  }, [user, preferences, ai, updatePreferences])

  return {
    preferences,
    isLoading,
    updatePreferences,
    toggleTheme,
    toggleFontSize,
    toggleAnimations,
    toggleReducedMotion,
    toggleFeedLayout,
    toggleNotification,
    togglePrivacySetting,
    adaptToUserBehavior,
  }
} 