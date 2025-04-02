import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { metricsMiddleware, metricsEndpoint } from '../../src/middleware/metrics'
import { cache } from '../../src/lib/cache'

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(metricsMiddleware)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Metrics endpoint
app.get('/metrics', metricsEndpoint)

// Service routes
const services = {
  auth: 'http://auth-service:3000',
  user: 'http://user-service:3000',
  post: 'http://post-service:3000',
  notification: 'http://notification-service:3000',
  ai: 'http://ai-service:3000'
}

// Auth routes
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
  }
}))

// User routes
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': ''
  }
}))

// Post routes
app.use('/api/posts', createProxyMiddleware({
  target: services.post,
  changeOrigin: true,
  pathRewrite: {
    '^/api/posts': ''
  }
}))

// Notification routes
app.use('/api/notifications', createProxyMiddleware({
  target: services.notification,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': ''
  }
}))

// AI routes
app.use('/api/ai', createProxyMiddleware({
  target: services.ai,
  changeOrigin: true,
  pathRewrite: {
    '^/api/ai': ''
  }
}))

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
}) 