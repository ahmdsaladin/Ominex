import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material'
import { useTheme } from '../contexts/ThemeContext'
import { PostCard } from '../components/PostCard'
import { AchievementCard } from '../components/AchievementCard'
import { FollowButton } from '../components/FollowButton'
import { EditProfileButton } from '../components/EditProfileButton'

const GET_USER_PROFILE = gql`
  query GetUserProfile($id: ID!) {
    user(id: $id) {
      id
      name
      bio
      avatar
      location
      website
      createdAt
      followers {
        id
        name
        avatar
      }
      following {
        id
        name
        avatar
      }
      achievements {
        id
        name
        description
        icon
        points
        createdAt
      }
      posts {
        id
        content
        media
        createdAt
        likes {
          id
          user {
            id
            name
          }
        }
        comments {
          id
          content
          author {
            id
            name
          }
        }
      }
    }
  }
`

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const [tabValue, setTabValue] = useState(0)

  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { id },
    skip: !id
  })

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error.message}</Alert>
      </Container>
    )
  }

  const user = data?.user

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar
                  src={user.avatar}
                  sx={{ width: 150, height: 150, mb: 2 }}
                />
                <Typography variant="h5" gutterBottom>
                  {user.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {user.bio}
                </Typography>
                {user.location && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    📍 {user.location}
                  </Typography>
                )}
                {user.website && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    🌐 {user.website}
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <FollowButton userId={user.id} />
                  <EditProfileButton userId={user.id} />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Typography variant="h6">
                  {user.followers.length} Followers
                </Typography>
                <Typography variant="h6">
                  {user.following.length} Following
                </Typography>
                <Typography variant="h6">
                  {user.posts.length} Posts
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab label="Posts" />
                  <Tab label="Achievements" />
                  <Tab label="About" />
                </Tabs>
              </Box>
              <TabPanel value={tabValue} index={0}>
                {user.posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  {user.achievements.map((achievement: any) => (
                    <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                      <AchievementCard achievement={achievement} />
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <Typography variant="body1" paragraph>
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {user.achievements.slice(0, 5).map((achievement: any) => (
                    <Chip
                      key={achievement.id}
                      label={achievement.name}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </TabPanel>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  )
} 