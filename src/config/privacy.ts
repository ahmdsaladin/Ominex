import { env } from '../lib/env'

export const PRIVACY_CONFIG = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    iterations: 100000,
    keyRotation: {
      standard: 30, // days
      military: 7, // days
    },
  },

  blockchain: {
    network: env.BLOCKCHAIN_NETWORK || 'mainnet',
    rpcUrl: env.BLOCKCHAIN_RPC_URL,
    contracts: {
      dataControl: env.DATA_CONTROL_CONTRACT_ADDRESS,
      auth: env.AUTH_CONTRACT_ADDRESS,
    },
    gasLimit: 500000,
    confirmations: 3,
  },

  biometric: {
    algorithms: {
      fingerprint: 'sha256',
      face: 'sha512',
      voice: 'sha384',
    },
    thresholds: {
      fingerprint: 0.95,
      face: 0.98,
      voice: 0.90,
    },
    maxAttempts: 3,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
  },

  anonymous: {
    idLength: 32,
    rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxActiveIds: 5,
  },

  rateLimits: {
    standard: {
      requests: 1000,
      window: 60 * 60 * 1000, // 1 hour
    },
    military: {
      requests: 100,
      window: 60 * 60 * 1000, // 1 hour
    },
  },

  dataSharing: {
    analytics: {
      enabled: true,
      retention: 30 * 24 * 60 * 60 * 1000, // 30 days
      anonymization: true,
    },
    marketing: {
      enabled: true,
      optIn: true,
      retention: 365 * 24 * 60 * 60 * 1000, // 1 year
    },
    thirdParty: {
      enabled: false,
      whitelist: [
        'google-analytics.com',
        'stripe.com',
        'cloudflare.com',
      ],
    },
  },

  logging: {
    access: {
      enabled: true,
      retention: 90 * 24 * 60 * 60 * 1000, // 90 days
      anonymization: true,
    },
    security: {
      enabled: true,
      retention: 365 * 24 * 60 * 60 * 1000, // 1 year
      level: 'info',
    },
  },

  compliance: {
    gdpr: {
      enabled: true,
      dataPortability: true,
      rightToBeForgotten: true,
    },
    ccpa: {
      enabled: true,
      optOut: true,
      dataDeletion: true,
    },
    hipaa: {
      enabled: false,
      phi: false,
      encryption: false,
    },
  },

  security: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    },
    cors: {
      enabled: true,
      origin: env.ALLOWED_ORIGINS?.split(',') || ['https://ominex.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    session: {
      secret: env.SESSION_SECRET,
      name: 'ominex_session',
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  },
}

export const SENSITIVE_FIELDS = [
  'password',
  'creditCard',
  'ssn',
  'address',
  'phone',
  'email',
  'dob',
  'nationalId',
  'passport',
  'bankAccount',
]

export const PRIVACY_LEVELS = {
  standard: {
    encryption: 'aes-256-gcm',
    keyRotation: PRIVACY_CONFIG.encryption.keyRotation.standard,
    rateLimit: PRIVACY_CONFIG.rateLimits.standard,
  },
  military: {
    encryption: 'aes-256-gcm',
    keyRotation: PRIVACY_CONFIG.encryption.keyRotation.military,
    rateLimit: PRIVACY_CONFIG.rateLimits.military,
    additionalFeatures: [
      'biometricAuth',
      'blockchainVerification',
      'anonymousMode',
    ],
  },
}

export const DEFAULT_PRIVACY_SETTINGS = {
  anonymousMode: false,
  dataSharing: {
    analytics: true,
    marketing: false,
    thirdParty: false,
  },
  blockchainControl: {
    enabled: false,
  },
  biometricAuth: {
    enabled: false,
    type: 'fingerprint',
  },
  encryption: {
    level: 'standard',
    keyRotation: PRIVACY_CONFIG.encryption.keyRotation.standard,
  },
} 