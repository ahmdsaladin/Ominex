import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { lightTheme, darkTheme, cyberpunkTheme } from '../styles/theme'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'cyberpunk'
  setTheme: (theme: 'light' | 'dark' | 'cyberpunk') => void
  fontSize: 'small' | 'medium' | 'large'
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  reducedMotion: boolean
  setReducedMotion: (reduced: boolean) => void
  highContrast: boolean
  setHighContrast: (high: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'cyberpunk'>('light')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  // Load theme preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'cyberpunk'
    const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large'
    const savedReducedMotion = localStorage.getItem('reducedMotion') === 'true'
    const savedHighContrast = localStorage.getItem('highContrast') === 'true'

    if (savedTheme) setTheme(savedTheme)
    if (savedFontSize) setFontSize(savedFontSize)
    if (savedReducedMotion) setReducedMotion(savedReducedMotion)
    if (savedHighContrast) setHighContrast(savedHighContrast)
  }, [])

  // Save theme preferences to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme)
    localStorage.setItem('fontSize', fontSize)
    localStorage.setItem('reducedMotion', reducedMotion.toString())
    localStorage.setItem('highContrast', highContrast.toString())
  }, [theme, fontSize, reducedMotion, highContrast])

  // Get the current theme based on selection
  const getCurrentTheme = () => {
    switch (theme) {
      case 'dark':
        return darkTheme
      case 'cyberpunk':
        return cyberpunkTheme
      default:
        return lightTheme
    }
  }

  // Apply accessibility settings
  const currentTheme = getCurrentTheme()
  const themeWithAccessibility = {
    ...currentTheme,
    typography: {
      ...currentTheme.typography,
      fontSize: fontSize === 'small' ? '0.875rem' : fontSize === 'large' ? '1.25rem' : '1rem',
    },
    components: {
      ...currentTheme.components,
      MuiButton: {
        ...currentTheme.components?.MuiButton,
        styleOverrides: {
          root: {
            ...currentTheme.components?.MuiButton?.styleOverrides?.root,
            transition: reducedMotion ? 'none' : undefined,
          },
        },
      },
    },
    palette: {
      ...currentTheme.palette,
      mode: highContrast ? 'dark' : currentTheme.palette.mode,
      contrastThreshold: highContrast ? 4.5 : 3,
    },
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        reducedMotion,
        setReducedMotion,
        highContrast,
        setHighContrast,
      }}
    >
      <MuiThemeProvider theme={themeWithAccessibility}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 