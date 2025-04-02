import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import { prisma } from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import { env } from './env'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      const dbUser = await prisma.user.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!dbUser) {
        if (user) {
          token.id = user?.id;
        }
        return token;
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
      };
    },
  },
};

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export class AuthService {
  private secret: string
  private expiresIn: string

  constructor() {
    this.secret = env.JWT_SECRET
    this.expiresIn = env.JWT_EXPIRES_IN
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret) as JWTPayload
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  async validateUser(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    })
    return user?.isActive ?? false
  }

  async getUserFromToken(token: string) {
    const payload = this.verifyToken(token)
    const isValid = await this.validateUser(payload.userId)
    
    if (!isValid) {
      throw new Error('User is not active')
    }

    return prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        isVerified: true,
        preferences: true,
      },
    })
  }

  generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'password_reset' },
      this.secret,
      { expiresIn: '1h' }
    )
  }

  generateEmailVerificationToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'email_verification' },
      this.secret,
      { expiresIn: '24h' }
    )
  }

  verifyPasswordResetToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret) as { userId: string; type: string }
      if (payload.type !== 'password_reset') {
        throw new Error('Invalid token type')
      }
      return { userId: payload.userId }
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  verifyEmailVerificationToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret) as { userId: string; type: string }
      if (payload.type !== 'email_verification') {
        throw new Error('Invalid token type')
      }
      return { userId: payload.userId }
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  generateApiKey(userId: string, platform: string): string {
    return jwt.sign(
      { userId, platform, type: 'api_key' },
      this.secret,
      { expiresIn: '30d' }
    )
  }

  verifyApiKey(token: string): { userId: string; platform: string } {
    try {
      const payload = jwt.verify(token, this.secret) as { userId: string; platform: string; type: string }
      if (payload.type !== 'api_key') {
        throw new Error('Invalid token type')
      }
      return { userId: payload.userId, platform: payload.platform }
    } catch (error) {
      throw new Error('Invalid or expired API key')
    }
  }
}

export const auth = new AuthService() 