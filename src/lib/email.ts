import nodemailer from 'nodemailer'
import { env } from './env'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT),
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export class EmailService {
  private from: string
  private transporter: nodemailer.Transporter

  constructor() {
    this.from = env.EMAIL_FROM
    this.transporter = transporter
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: this.from,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    }

    await this.transporter.sendMail(mailOptions)
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Welcome to Ominex!',
      html: `
        <h1>Welcome to Ominex, ${name}!</h1>
        <p>Thank you for joining our platform. We're excited to have you on board!</p>
        <p>With Ominex, you can:</p>
        <ul>
          <li>Manage all your social media accounts in one place</li>
          <li>Schedule and automate your posts</li>
          <li>Track your analytics across platforms</li>
          <li>Engage with your audience more effectively</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    
    await this.sendEmail({
      to,
      subject: 'Reset Your Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }

  async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    
    await this.sendEmail({
      to,
      subject: 'Verify Your Email',
      html: `
        <h1>Verify Your Email</h1>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: title,
      html: `
        <h1>${title}</h1>
        <p>${message}</p>
        ${actionUrl ? `<p><a href="${actionUrl}">Take Action</a></p>` : ''}
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }

  async sendSubscriptionConfirmation(
    to: string,
    plan: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Subscription Confirmed',
      html: `
        <h1>Subscription Confirmed</h1>
        <p>Thank you for subscribing to our ${plan} plan!</p>
        <p>Your subscription details:</p>
        <ul>
          <li>Plan: ${plan}</li>
          <li>Amount: ${amount} ${currency}</li>
          <li>Billing Cycle: Monthly</li>
        </ul>
        <p>You now have access to all premium features.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }

  async sendSubscriptionCancellation(
    to: string,
    plan: string,
    endDate: Date
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Subscription Cancelled',
      html: `
        <h1>Subscription Cancelled</h1>
        <p>Your subscription to the ${plan} plan has been cancelled.</p>
        <p>Your access will continue until ${endDate.toLocaleDateString()}.</p>
        <p>We're sorry to see you go. If you change your mind, you can resubscribe at any time.</p>
        <p>If you have any feedback, please let us know.</p>
        <p>Best regards,<br>The Ominex Team</p>
      `,
    })
  }
}

export const email = new EmailService() 