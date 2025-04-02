import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme,
} from '@mui/material'
import {
  Lock,
  ShoppingCart,
  Subscriptions,
  AccountBalanceWallet,
} from '@mui/icons-material'
import { useUser } from '../contexts/UserContext'
import { monetization } from '../lib/monetization'
import { glassmorphismStyles, neonStyles, animationStyles } from '../styles/theme'

interface ContentPurchaseProps {
  post: {
    id: string
    title: string
    description: string
    price: number
    type: 'text' | 'image' | 'video'
    media?: string[]
    author: {
      id: string
      username: string
      avatar?: string
    }
  }
  subscriptionTiers?: Array<{
    name: string
    price: number
    benefits: string[]
  }>
}

export function ContentPurchase({ post, subscriptionTiers }: ContentPurchaseProps) {
  const theme = useTheme()
  const { user } = useUser()
  const [purchaseDialog, setPurchaseDialog] = useState(false)
  const [subscriptionDialog, setSubscriptionDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto')
  const [selectedTier, setSelectedTier] = useState<string>('')

  const handlePurchase = async () => {
    try {
      await monetization.purchaseExclusiveContent(post.id, user!.id, paymentMethod)
      setPurchaseDialog(false)
    } catch (error) {
      console.error('Error purchasing content:', error)
    }
  }

  const handleSubscribe = async () => {
    try {
      await monetization.createSubscription(
        post.author.id,
        user!.id,
        selectedTier as 'basic' | 'premium' | 'exclusive',
        paymentMethod
      )
      setSubscriptionDialog(false)
    } catch (error) {
      console.error('Error subscribing:', error)
    }
  }

  return (
    <>
      <Card
        sx={{
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Lock sx={{ color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h6">Exclusive Content</Typography>
          </Box>

          <Typography variant="h5" gutterBottom>
            {post.title}
          </Typography>

          <Typography variant="body1" sx={{ mb: 2 }}>
            {post.description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccountBalanceWallet sx={{ mr: 1 }} />
            <Typography variant="h6">
              {post.price} ETH
            </Typography>
          </Box>

          <Button
            variant="contained"
            fullWidth
            startIcon={<ShoppingCart />}
            onClick={() => setPurchaseDialog(true)}
            sx={{
              ...glassmorphismStyles,
              ...neonStyles.boxShadow,
            }}
          >
            Purchase Content
          </Button>

          {subscriptionTiers && subscriptionTiers.length > 0 && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Subscriptions />}
              onClick={() => setSubscriptionDialog(true)}
              sx={{ mt: 2 }}
            >
              Subscribe to Creator
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog
        open={purchaseDialog}
        onClose={() => setPurchaseDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Purchase Exclusive Content</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {post.title}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {post.description}
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              {post.price} ETH
            </Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                label="Payment Method"
                onChange={e => setPaymentMethod(e.target.value as 'crypto' | 'fiat')}
              >
                <MenuItem value="crypto">Cryptocurrency (ETH)</MenuItem>
                <MenuItem value="fiat">Fiat Currency (USD)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePurchase}
            sx={{
              ...glassmorphismStyles,
              ...neonStyles.boxShadow,
            }}
          >
            Confirm Purchase
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog
        open={subscriptionDialog}
        onClose={() => setSubscriptionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Subscribe to {post.author.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {subscriptionTiers.map(tier => (
                <Grid item xs={12} key={tier.name}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedTier === tier.name
                        ? `2px solid ${theme.palette.primary.main}`
                        : 'none',
                      ...animationStyles.hover,
                    }}
                    onClick={() => setSelectedTier(tier.name)}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}
                      </Typography>
                      <Typography variant="h5" color="primary" gutterBottom>
                        ${tier.price}/month
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {tier.benefits.map(benefit => (
                          <Typography key={benefit} variant="body2" sx={{ mb: 0.5 }}>
                            • {benefit}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                label="Payment Method"
                onChange={e => setPaymentMethod(e.target.value as 'crypto' | 'fiat')}
              >
                <MenuItem value="crypto">Cryptocurrency (ETH)</MenuItem>
                <MenuItem value="fiat">Fiat Currency (USD)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubscribe}
            disabled={!selectedTier}
            sx={{
              ...glassmorphismStyles,
              ...neonStyles.boxShadow,
            }}
          >
            Confirm Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 