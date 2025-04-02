import React from 'react'
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'

const providers = [
  {
    name: 'Google',
    icon: <GoogleIcon />,
    color: '#DB4437',
  },
  {
    name: 'Facebook',
    icon: <FacebookIcon />,
    color: '#4267B2',
  },
  {
    name: 'Twitter',
    icon: <TwitterIcon />,
    color: '#1DA1F2',
  },
  {
    name: 'GitHub',
    icon: <GitHubIcon />,
    color: '#333333',
  },
  {
    name: 'LinkedIn',
    icon: <LinkedInIcon />,
    color: '#0077B5',
  },
]

export function OAuthLogin() {
  const { loginWithOAuth, loading, error } = useAuth()

  const handleLogin = async (provider: string) => {
    try {
      // Open OAuth popup
      const popup = window.open(
        `${process.env.REACT_APP_API_URL}/auth/${provider}`,
        'OAuth Login',
        'width=600,height=600'
      )

      // Listen for OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.origin !== process.env.REACT_APP_API_URL) return

        const { token } = event.data
        if (token) {
          await loginWithOAuth(provider, token)
          popup?.close()
        }
      })
    } catch (error) {
      console.error('OAuth login error:', error)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Sign in with
      </Typography>

      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error.message}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 2,
          width: '100%',
        }}
      >
        {providers.map((provider) => (
          <Button
            key={provider.name}
            variant="outlined"
            startIcon={provider.icon}
            onClick={() => handleLogin(provider.name.toLowerCase())}
            disabled={loading}
            sx={{
              color: provider.color,
              borderColor: provider.color,
              '&:hover': {
                borderColor: provider.color,
                backgroundColor: `${provider.color}10`,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              provider.name
            )}
          </Button>
        ))}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        By signing in, you agree to our Terms of Service and Privacy Policy
      </Typography>
    </Box>
  )
} 