import mongoose from 'mongoose'
import { cache } from './cache'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ominex'

let isConnected = false

export async function connectToMongoDB() {
  if (isConnected) {
    return
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    isConnected = true
    console.log('Connected to MongoDB')

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err)
      isConnected = false
    })

    // Handle disconnection
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected')
      isConnected = false
    })

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      process.exit(0)
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

// Cache wrapper for MongoDB operations
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get(key)
  if (cached) {
    return JSON.parse(cached)
  }

  // If not in cache, perform operation
  const result = await operation()

  // Store in cache
  await cache.set(key, JSON.stringify(result), { ttl })

  return result
}

// Batch operation helper
export async function batchOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map(operation))
  }
}

// Error handling wrapper
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(errorMessage, error)
    throw error
  }
}

// Health check
export async function checkMongoDBHealth(): Promise<boolean> {
  try {
    await mongoose.connection.db.admin().ping()
    return true
  } catch (error) {
    console.error('MongoDB health check failed:', error)
    return false
  }
} 