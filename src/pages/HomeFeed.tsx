import React, { useEffect, useState } from 'react'
import { useQuery, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useTheme } from '../contexts/ThemeContext'
import { PostCard } from '../components/PostCard'
import { CreatePost } from '../components/CreatePost'
import { TrendingTopics } from '../components/TrendingTopics'
import { RecommendedUsers } from '../components/RecommendedUsers'

const GET_FEED = gql`
  query GetFeed($first: Int, $after: String) {
    feed(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          content
          media
          createdAt
          author {
            id
            name
            avatar
          }
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const NEW_POST_SUBSCRIPTION = gql`
  subscription OnNewPost {
    newPost {
      id
      content
      media
      createdAt
      author {
        id
        name
        avatar
      }
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
`

export const HomeFeed: React.FC = () => {
  const { theme } = useTheme()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data, fetchMore, loading: loadingMore } = useQuery(GET_FEED, {
    variables: { first: 10 },
    onCompleted: (data) => {
      setPosts(data.feed.edges.map((edge: any) => edge.node))
      setLoading(false)
    },
    onError: (error) => {
      setError(error.message)
      setLoading(false)
    }
  })

  // Subscribe to new posts
  useSubscription(NEW_POST_SUBSCRIPTION, {
    onSubscriptionData: ({ subscriptionData }) => {
      const newPost = subscriptionData.data.newPost
      setPosts((prevPosts) => [newPost, ...prevPosts])
    }
  })

  // Infinite scroll
  const { lastElementRef, hasMore } = useInfiniteScroll({
    loading: loadingMore,
    hasMore: data?.feed.pageInfo.hasNextPage,
    onLoadMore: () => {
      fetchMore({
        variables: {
          first: 10,
          after: data.feed.pageInfo.endCursor
        }
      })
    }
  })

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {[...Array(3)].map((_, index) => (
          <Card key={index} sx={{ mb: 3 }}>
            <CardHeader
              avatar={<Skeleton variant="circular" width={40} height={40} />}
              title={<Skeleton width={200} />}
              subheader={<Skeleton width={100} />}
            />
            <CardContent>
              <Skeleton variant="rectangular" height={200} />
              <Box sx={{ mt: 2 }}>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <CreatePost />
          {posts.map((post, index) => (
            <div
              key={post.id}
              ref={index === posts.length - 1 ? lastElementRef : undefined}
            >
              <PostCard post={post} />
            </div>
          ))}
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <TrendingTopics />
          <RecommendedUsers />
        </Grid>
      </Grid>
    </Container>
  )
} 