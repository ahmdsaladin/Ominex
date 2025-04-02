import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { lightTheme, darkTheme, cyberpunkTheme } from '../styles/theme'
import { useUser } from './UserContext'
import { useAI } from '../lib/ai'

interface UIContextType {
  theme: 'light' | 'dark' | 'cyberpunk'
  setTheme: (theme: 'light' | 'dark' | 'cyberpunk') => void
  voiceEnabled: boolean
  setVoiceEnabled: (enabled: boolean) => void
  gestureEnabled: boolean
  setGestureEnabled: (enabled: boolean) => void
  uiPreferences: {
    feedLayout: 'grid' | 'list' | 'stories'
    fontSize: 'small' | 'medium' | 'large'
    animations: boolean
    reducedMotion: boolean
  }
  updateUIPreferences: (preferences: Partial<UIContextType['uiPreferences']>) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const ai = useAI()
  const [theme, setTheme] = useState<'light' | 'dark' | 'cyberpunk'>('dark')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const [uiPreferences, setUIPreferences] = useState({
    feedLayout: 'stories' as const,
    fontSize: 'medium' as const,
    animations: true,
    reducedMotion: false,
  })

  useEffect(() => {
    if (user) {
      // Load user's UI preferences
      const loadPreferences = async () => {
        const preferences = await ai.getUserPreferences(user.id)
        if (preferences) {
          setTheme(preferences.theme)
          setVoiceEnabled(preferences.voiceEnabled)
          setGestureEnabled(preferences.gestureEnabled)
          setUIPreferences(preferences.uiPreferences)
        }
      }
      loadPreferences()
    }
  }, [user, ai])

  const updateUIPreferences = async (newPreferences: Partial<UIContextType['uiPreferences']>) => {
    const updatedPreferences = { ...uiPreferences, ...newPreferences }
    setUIPreferences(updatedPreferences)

    if (user) {
      // Update preferences in AI service
      await ai.updateUserPreferences(user.id, {
        theme,
        voiceEnabled,
        gestureEnabled,
        uiPreferences: updatedPreferences,
      })
    }
  }

  const getTheme = () => {
    switch (theme) {
      case 'light':
        return lightTheme
      case 'dark':
        return darkTheme
      case 'cyberpunk':
        return cyberpunkTheme
      default:
        return darkTheme
    }
  }

  return (
    <UIContext.Provider
      value={{
        theme,
        setTheme,
        voiceEnabled,
        setVoiceEnabled,
        gestureEnabled,
        setGestureEnabled,
        uiPreferences,
        updateUIPreferences,
      }}
    >
      <ThemeProvider theme={getTheme()}>
        {children}
      </ThemeProvider>
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
} 