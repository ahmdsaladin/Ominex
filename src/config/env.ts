export const env = {
  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Authentication
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  nextAuthSecret: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-key',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ominex',

  // Social Media API Keys
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
  },
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
  },
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  },

  // AI Services
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  tensorflow: {
    modelUrl: process.env.TENSORFLOW_MODEL_URL,
  },

  // Blockchain
  ethereum: {
    nodeUrl: process.env.ETHEREUM_NODE_URL,
  },
  ipfs: {
    nodeUrl: process.env.IPFS_NODE_URL,
  },
  nft: {
    contractAddress: process.env.NFT_CONTRACT_ADDRESS,
  },

  // Security
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
} as const;

// Type-safe environment variables
export type Env = typeof env; 