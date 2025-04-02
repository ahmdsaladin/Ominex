import { useState, useEffect, useCallback } from 'react'
import { auth } from '../lib/auth'
import { User, AuthToken, MFASettings } from '../types'

interface UseAuthReturn {
  user: User | null
  token: AuthToken | null
  loading: boolean
  error: Error | null
  loginWithOAuth: (provider: string, token: string) => Promise<void>
  loginWithWeb3: (address: string, signature: string) => Promise<void>
  logout: () => Promise<void>
  setupMFA: (method: 'sms' | 'email') => Promise<MFASettings>
  verifyMFA: (code: string) => Promise<boolean>
  refreshToken: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<AuthToken | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load saved auth state
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const savedToken = localStorage.getItem('authToken')
        if (savedToken) {
          const parsedToken = JSON.parse(savedToken)
          setToken(parsedToken)

          // Verify token and get user
          const { user } = await auth.verifyToken(parsedToken.token)
          setUser(user)
        }
      } catch (error) {
        console.error('Error loading auth state:', error)
        setError(error instanceof Error ? error : new Error('Failed to load auth state'))
      } finally {
        setLoading(false)
      }
    }

    loadAuthState()
  }, [])

  // Save auth state
  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', JSON.stringify(token))
    } else {
      localStorage.removeItem('authToken')
    }
  }, [token])

  // OAuth login
  const loginWithOAuth = useCallback(async (provider: string, token: string) => {
    try {
      setLoading(true)
      setError(null)

      const { user, authToken } = await auth.authenticateWithOAuth(
        provider as any,
        token
      )

      setUser(user)
      setToken(authToken)
    } catch (error) {
      console.error('OAuth login error:', error)
      setError(error instanceof Error ? error : new Error('Failed to login'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Web3 login
  const loginWithWeb3 = useCallback(async (address: string, signature: string) => {
    try {
      setLoading(true)
      setError(null)

      const { user, authToken } = await auth.authenticateWithWeb3(address, signature)

      setUser(user)
      setToken(authToken)
    } catch (error) {
      console.error('Web3 login error:', error)
      setError(error instanceof Error ? error : new Error('Failed to login'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (token) {
        await auth.invalidateToken(token.token)
      }

      setUser(null)
      setToken(null)
    } catch (error) {
      console.error('Logout error:', error)
      setError(error instanceof Error ? error : new Error('Failed to logout'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [token])

  // MFA setup
  const setupMFA = useCallback(async (method: 'sms' | 'email') => {
    try {
      setLoading(true)
      setError(null)

      if (!user) throw new Error('User not authenticated')

      const mfaSettings = await auth.setupMFA(user.id, method)
      return mfaSettings
    } catch (error) {
      console.error('MFA setup error:', error)
      setError(error instanceof Error ? error : new Error('Failed to setup MFA'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [user])

  // MFA verification
  const verifyMFA = useCallback(async (code: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!user) throw new Error('User not authenticated')

      const { isValid } = await auth.verifyMFA(user.id, code)
      return isValid
    } catch (error) {
      console.error('MFA verification error:', error)
      setError(error instanceof Error ? error : new Error('Failed to verify MFA'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [user])

  // Token refresh
  const refreshToken = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) throw new Error('No token to refresh')

      const newToken = await auth.refreshToken(token.token)
      setToken(newToken)
    } catch (error) {
      console.error('Token refresh error:', error)
      setError(error instanceof Error ? error : new Error('Failed to refresh token'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    user,
    token,
    loading,
    error,
    loginWithOAuth,
    loginWithWeb3,
    logout,
    setupMFA,
    verifyMFA,
    refreshToken,
  }
} 