import Stripe from 'stripe'
import { env } from './env'
import { prisma } from './db'
import { email } from './email'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Up to 3 social media accounts',
      'Basic analytics',
      'Scheduled posts',
      'Basic AI content suggestions',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Up to 10 social media accounts',
      'Advanced analytics',
      'Scheduled posts',
      'Advanced AI content suggestions',
      'Custom branding',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited social media accounts',
      'Advanced analytics',
      'Scheduled posts',
      'Advanced AI content suggestions',
      'Custom branding',
      'Priority support',
      'API access',
      'Dedicated account manager',
    ],
  },
]

export class PaymentService {
  private stripe: Stripe

  constructor() {
    this.stripe = stripe
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customer.id,
      },
    })

    return customer.id
  }

  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string
  ): Promise<{
    subscriptionId: string
    clientSecret: string
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const plan = subscriptionPlans.find((p) => p.id === planId)
    if (!plan) {
      throw new Error('Invalid plan')
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      customerId = await this.createCustomer(userId, user.email)
    }

    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // Create subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: env.STRIPE_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

    // Store subscription in database
    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        tier: planId,
        amount: plan.price,
        currency: plan.currency,
        status: subscription.status,
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000),
      },
    })

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret || '',
    }
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    })

    if (!subscription) {
      throw new Error('No active subscription found')
    }

    await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId)

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        endDate: new Date(),
      },
    })

    // Send cancellation email
    await email.sendSubscriptionCancellation(
      userId,
      subscription.tier,
      subscription.endDate
    )
  }

  async updateSubscription(
    userId: string,
    newPlanId: string
  ): Promise<{
    subscriptionId: string
    clientSecret: string
  }> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    })

    if (!subscription) {
      throw new Error('No active subscription found')
    }

    const plan = subscriptionPlans.find((p) => p.id === newPlanId)
    if (!plan) {
      throw new Error('Invalid plan')
    }

    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [{ price: env.STRIPE_PRICE_ID }],
        proration_behavior: 'always_invoice',
        expand: ['latest_invoice.payment_intent'],
      }
    )

    const invoice = updatedSubscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        tier: newPlanId,
        amount: plan.price,
        currency: plan.currency,
        status: updatedSubscription.status,
        endDate: new Date(updatedSubscription.current_period_end * 1000),
      },
    })

    return {
      subscriptionId: updatedSubscription.id,
      clientSecret: paymentIntent.client_secret || '',
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription
        await this.handleSubscriptionUpdated(subscription)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        await this.handleSubscriptionDeleted(deletedSubscription)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        await this.handlePaymentSucceeded(invoice)
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice
        await this.handlePaymentFailed(failedInvoice)
        break
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    })

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: subscription.status,
          endDate: new Date(subscription.current_period_end * 1000),
        },
      })
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    })

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'cancelled',
          endDate: new Date(),
        },
      })
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: invoice.subscription as string,
      },
    })

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
        },
      })

      // Send confirmation email
      await email.sendSubscriptionConfirmation(
        subscription.userId,
        subscription.tier,
        subscription.amount,
        subscription.currency
      )
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: invoice.subscription as string,
      },
    })

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'past_due',
        },
      })

      // Send payment failure notification
      await email.sendNotificationEmail(
        subscription.userId,
        'Payment Failed',
        'Your subscription payment has failed. Please update your payment method to continue using our services.',
        `${process.env.NEXT_PUBLIC_APP_URL}/billing`
      )
    }
  }
}

export const payments = new PaymentService() 