import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core'
import { createServer } from 'http'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { connectToMongoDB } from '../lib/mongodb'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '../lib/auth'
import { metricsMiddleware, metricsEndpoint } from '../middleware/metrics'

const prisma = new PrismaClient()

async function startServer() {
  // Connect to MongoDB
  await connectToMongoDB()

  const app = express()
  const httpServer = createServer(app)

  // Add metrics middleware
  app.use(metricsMiddleware)
  app.get('/metrics', metricsEndpoint)

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) return {}

      try {
        const user = await verifyToken(token)
        return { user }
      } catch (error) {
        console.error('Token verification error:', error)
        return {}
      }
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        requestDidStart: async () => ({
          willSendResponse: async ({ response }) => {
            // Add cache control headers
            if (response.data?.me || response.data?.user) {
              response.http?.headers.set('Cache-Control', 'private, max-age=300')
            }
          },
          parsingDidStart: async () => ({
            willParseQuery: async ({ query }) => {
              // Log complex queries
              if (query.length > 1000) {
                console.warn('Complex query detected:', query)
              }
            }
          })
        })
      }
    ],
    formatError: (error) => {
      // Log errors
      console.error('GraphQL Error:', error)

      // Return sanitized error
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
        }
      }
    },
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production'
  })

  // Start server
  await server.start()

  // Apply middleware
  server.applyMiddleware({ app })

  // Start HTTP server
  const PORT = process.env.PORT || 4000
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
  })

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...')
    await server.stop()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
}) 