import { ethers } from 'ethers'
import { prisma } from '../prisma'
import { env } from '../env'
import { Post, User, Subscription, Payment } from '../../types'

export class MonetizationService {
  private static instance: MonetizationService
  private provider: ethers.providers.JsonRpcProvider
  private wallet: ethers.Wallet

  private constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(env.ETH_RPC_URL)
    this.wallet = new ethers.Wallet(env.PRIVATE_KEY, this.provider)
  }

  static getInstance(): MonetizationService {
    if (!MonetizationService.instance) {
      MonetizationService.instance = new MonetizationService()
    }
    return MonetizationService.instance
  }

  async createSubscription(
    creatorId: string,
    subscriberId: string,
    tier: 'basic' | 'premium' | 'exclusive',
    paymentMethod: 'crypto' | 'fiat'
  ): Promise<Subscription> {
    try {
      const creator = await prisma.user.findUnique({
        where: { id: creatorId },
        include: { subscriptionTiers: true },
      })

      if (!creator) throw new Error('Creator not found')

      const tierConfig = creator.subscriptionTiers.find(t => t.name === tier)
      if (!tierConfig) throw new Error('Invalid subscription tier')

      const subscription = await prisma.subscription.create({
        data: {
          creatorId,
          subscriberId,
          tier,
          amount: tierConfig.price,
          paymentMethod,
          status: 'pending',
        },
      })

      // Process payment
      if (paymentMethod === 'crypto') {
        await this.processCryptoPayment(subscription)
      } else {
        await this.processFiatPayment(subscription)
      }

      return subscription
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  async processCryptoPayment(subscription: Subscription): Promise<void> {
    try {
      // Create payment transaction
      const tx = await this.wallet.sendTransaction({
        to: subscription.creatorId,
        value: ethers.utils.parseEther(subscription.amount.toString()),
      })

      // Wait for transaction confirmation
      await tx.wait()

      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          paymentTxHash: tx.hash,
        },
      })
    } catch (error) {
      console.error('Error processing crypto payment:', error)
      throw error
    }
  }

  async processFiatPayment(subscription: Subscription): Promise<void> {
    // Implement fiat payment processing (e.g., Stripe)
    // This is a placeholder for the actual implementation
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'active' },
    })
  }

  async createExclusiveContent(
    creatorId: string,
    content: {
      title: string
      description: string
      price: number
      type: 'text' | 'image' | 'video'
      media?: string[]
    }
  ): Promise<Post> {
    try {
      const post = await prisma.post.create({
        data: {
          authorId: creatorId,
          content: content.description,
          type: content.type,
          media: content.media,
          isExclusive: true,
          price: content.price,
        },
      })

      return post
    } catch (error) {
      console.error('Error creating exclusive content:', error)
      throw error
    }
  }

  async purchaseExclusiveContent(
    postId: string,
    buyerId: string,
    paymentMethod: 'crypto' | 'fiat'
  ): Promise<Payment> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { author: true },
      })

      if (!post || !post.isExclusive) {
        throw new Error('Invalid exclusive content')
      }

      const payment = await prisma.payment.create({
        data: {
          postId,
          buyerId,
          sellerId: post.authorId,
          amount: post.price,
          paymentMethod,
          status: 'pending',
        },
      })

      // Process payment
      if (paymentMethod === 'crypto') {
        await this.processCryptoPayment(payment)
      } else {
        await this.processFiatPayment(payment)
      }

      return payment
    } catch (error) {
      console.error('Error purchasing exclusive content:', error)
      throw error
    }
  }

  async calculateCreatorRevenue(creatorId: string): Promise<{
    totalRevenue: number
    subscriptionRevenue: number
    contentRevenue: number
    adRevenue: number
  }> {
    try {
      const [subscriptions, contentSales, adRevenue] = await Promise.all([
        prisma.subscription.findMany({
          where: { creatorId, status: 'active' },
          select: { amount: true },
        }),
        prisma.payment.findMany({
          where: { sellerId: creatorId, status: 'completed' },
          select: { amount: true },
        }),
        prisma.adRevenue.findMany({
          where: { creatorId },
          select: { amount: true },
        }),
      ])

      const subscriptionRevenue = subscriptions.reduce(
        (sum, sub) => sum + sub.amount,
        0
      )
      const contentRevenue = contentSales.reduce(
        (sum, sale) => sum + sale.amount,
        0
      )
      const adRevenue = adRevenue.reduce((sum, ad) => sum + ad.amount, 0)

      return {
        totalRevenue: subscriptionRevenue + contentRevenue + adRevenue,
        subscriptionRevenue,
        contentRevenue,
        adRevenue,
      }
    } catch (error) {
      console.error('Error calculating creator revenue:', error)
      throw error
    }
  }

  async distributeAdRevenue(
    creatorId: string,
    amount: number,
    metrics: {
      views: number
      engagement: number
      reach: number
    }
  ): Promise<void> {
    try {
      // Calculate revenue share based on performance metrics
      const performanceScore = this.calculatePerformanceScore(metrics)
      const revenueShare = amount * performanceScore

      // Record ad revenue
      await prisma.adRevenue.create({
        data: {
          creatorId,
          amount: revenueShare,
          metrics,
        },
      })
    } catch (error) {
      console.error('Error distributing ad revenue:', error)
      throw error
    }
  }

  private calculatePerformanceScore(metrics: {
    views: number
    engagement: number
    reach: number
  }): number {
    // Implement performance scoring algorithm
    // This is a simplified example
    const viewWeight = 0.4
    const engagementWeight = 0.4
    const reachWeight = 0.2

    const viewScore = Math.min(metrics.views / 10000, 1)
    const engagementScore = Math.min(metrics.engagement / 1000, 1)
    const reachScore = Math.min(metrics.reach / 50000, 1)

    return (
      viewScore * viewWeight +
      engagementScore * engagementWeight +
      reachScore * reachWeight
    )
  }
}

export const monetization = MonetizationService.getInstance() 