import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material'
import {
  MonetizationOn,
  Subscriptions,
  ShoppingCart,
  TrendingUp,
  Settings,
} from '@mui/icons-material'
import { useUser } from '../contexts/UserContext'
import { monetization } from '../lib/monetization'
import { glassmorphismStyles, neonStyles, animationStyles } from '../styles/theme'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`creator-tabpanel-${index}`}
      aria-labelledby={`creator-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export function CreatorDashboard() {
  const theme = useTheme()
  const { user } = useUser()
  const [tabValue, setTabValue] = useState(0)
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    subscriptionRevenue: 0,
    contentRevenue: 0,
    adRevenue: 0,
  })
  const [subscriptionTiers, setSubscriptionTiers] = useState([
    { name: 'basic', price: 5, benefits: ['Basic content access'] },
    { name: 'premium', price: 15, benefits: ['All basic benefits', 'Exclusive content'] },
    { name: 'exclusive', price: 30, benefits: ['All premium benefits', 'Direct messaging'] },
  ])
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    price: 0,
    type: 'text' as const,
    media: [] as string[],
  })

  useEffect(() => {
    if (user) {
      loadRevenue()
    }
  }, [user])

  const loadRevenue = async () => {
    try {
      const revenueData = await monetization.calculateCreatorRevenue(user!.id)
      setRevenue(revenueData)
    } catch (error) {
      console.error('Error loading revenue:', error)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleCreateSubscription = async () => {
    // Implement subscription creation
  }

  const handleCreateExclusiveContent = async () => {
    try {
      await monetization.createExclusiveContent(user!.id, newContent)
      setNewContent({
        title: '',
        description: '',
        price: 0,
        type: 'text',
        media: [],
      })
    } catch (error) {
      console.error('Error creating exclusive content:', error)
    }
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
        Creator Dashboard
      </Typography>

      <Card
        sx={{
          mb: 3,
          ...glassmorphismStyles,
          ...animationStyles.hover,
        }}
      >
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'rgba(0, 255, 157, 0.1)',
                }}
              >
                <MonetizationOn sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                <Typography variant="h6">Total Revenue</Typography>
                <Typography variant="h4">${revenue.totalRevenue}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 0, 255, 0.1)',
                }}
              >
                <Subscriptions sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
                <Typography variant="h6">Subscriptions</Typography>
                <Typography variant="h4">${revenue.subscriptionRevenue}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'rgba(0, 255, 255, 0.1)',
                }}
              >
                <ShoppingCart sx={{ fontSize: 40, color: 'cyan' }} />
                <Typography variant="h6">Content Sales</Typography>
                <Typography variant="h4">${revenue.contentRevenue}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 255, 0, 0.1)',
                }}
              >
                <TrendingUp sx={{ fontSize: 40, color: 'yellow' }} />
                <Typography variant="h6">Ad Revenue</Typography>
                <Typography variant="h4">${revenue.adRevenue}</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<Subscriptions />} label="Subscriptions" />
          <Tab icon={<ShoppingCart />} label="Exclusive Content" />
          <Tab icon={<Settings />} label="Settings" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {subscriptionTiers.map(tier => (
            <Grid item xs={12} md={4} key={tier.name}>
              <Card
                sx={{
                  ...glassmorphismStyles,
                  ...animationStyles.hover,
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    ${tier.price}/month
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {tier.benefits.map(benefit => (
                      <Typography key={benefit} variant="body2" sx={{ mb: 1 }}>
                        • {benefit}
                      </Typography>
                    ))}
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={handleCreateSubscription}
                  >
                    Create Tier
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card
          sx={{
            ...glassmorphismStyles,
            ...animationStyles.hover,
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Create Exclusive Content
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={newContent.title}
                  onChange={e => setNewContent({ ...newContent, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={newContent.description}
                  onChange={e => setNewContent({ ...newContent, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Price (ETH)"
                  value={newContent.price}
                  onChange={e => setNewContent({ ...newContent, price: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={newContent.type}
                    label="Content Type"
                    onChange={e => setNewContent({ ...newContent, type: e.target.value as any })}
                  >
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="image">Image</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCreateExclusiveContent}
                >
                  Create Content
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card
          sx={{
            ...glassmorphismStyles,
            ...animationStyles.hover,
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monetization Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Methods</InputLabel>
                  <Select
                    multiple
                    value={['crypto', 'fiat']}
                    label="Payment Methods"
                    onChange={() => {}}
                  >
                    <MenuItem value="crypto">Cryptocurrency</MenuItem>
                    <MenuItem value="fiat">Fiat Currency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Revenue Share</InputLabel>
                  <Select
                    value={80}
                    label="Revenue Share"
                    onChange={() => {}}
                  >
                    <MenuItem value={80}>80% (Platform: 20%)</MenuItem>
                    <MenuItem value={90}>90% (Platform: 10%)</MenuItem>
                    <MenuItem value={95}>95% (Platform: 5%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" fullWidth>
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  )
} 