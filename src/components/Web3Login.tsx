import React, { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { useAuth } from '../hooks/useAuth'
import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (params: any) => void) => void
      removeListener: (event: string, callback: (params: any) => void) => void
    }
  }
}

export function Web3Login() {
  const { loginWithWeb3, loading, error } = useAuth()
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        setAddress(accounts[0])
        setShowSignatureDialog(true)
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw error
    }
  }

  const handleSignMessage = async () => {
    try {
      if (!window.ethereum || !address) {
        throw new Error('Wallet not connected')
      }

      // Create message to sign
      const message = 'Sign in with Ethereum'
      const messageHash = ethers.utils.hashMessage(message)

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageHash, address],
      })

      // Login with signature
      await loginWithWeb3(address, signature)
      setShowSignatureDialog(false)
    } catch (error) {
      console.error('Signature error:', error)
      throw error
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
        Sign in with Web3
      </Typography>

      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error.message}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={connectWallet}
        disabled={loading}
        startIcon={
          loading ? (
            <CircularProgress size={20} />
          ) : (
            <img
              src="/metamask.svg"
              alt="MetaMask"
              style={{ width: 20, height: 20 }}
            />
          )
        }
      >
        {loading
          ? 'Connecting...'
          : address
          ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
          : 'Connect MetaMask'}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        By signing in, you agree to our Terms of Service and Privacy Policy
      </Typography>

      <Dialog
        open={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
      >
        <DialogTitle>Sign Message</DialogTitle>
        <DialogContent>
          <Typography>
            To complete the sign-in process, please sign the message with your
            wallet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSignatureDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSignMessage}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign Message'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 