import { Request, Response, NextFunction } from 'express'
import { getPrivacyManager } from '../lib/security/privacy-manager'
import { verifySignature } from '../lib/crypto'

export interface PrivacyRequest extends Request {
  privacy?: {
    anonymousId?: string
    blockchainVerified?: boolean
    biometricVerified?: boolean
    dataAccessLog?: any
  }
}

export async function privacyMiddleware(
  req: PrivacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const privacyManager = getPrivacyManager()
  const userId = req.user?.id

  if (!userId) {
    next()
    return
  }

  try {
    // Check for anonymous mode
    const anonymousId = req.headers['x-anonymous-id'] as string
    if (anonymousId) {
      const mappedUserId = await privacyManager.getAnonymousUserId(anonymousId)
      if (mappedUserId === userId) {
        req.privacy = { ...req.privacy, anonymousId }
      }
    }

    // Verify blockchain signature if present
    const blockchainSignature = req.headers['x-blockchain-signature'] as string
    if (blockchainSignature) {
      const message = `${req.method}${req.path}${JSON.stringify(req.body)}`
      const isValid = await verifySignature(message, blockchainSignature, req.user?.walletAddress)
      req.privacy = { ...req.privacy, blockchainVerified: isValid }
    }

    // Verify biometric authentication if enabled
    const biometricToken = req.headers['x-biometric-token'] as string
    if (biometricToken) {
      const isValid = await privacyManager.authenticateWithBiometrics(userId, biometricToken)
      req.privacy = { ...req.privacy, biometricVerified: isValid }
    }

    // Log data access
    const dataAccessLog = {
      userId,
      accessType: req.method.toLowerCase() as 'read' | 'write' | 'delete',
      dataType: req.path.split('/')[1] || 'unknown',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }

    await privacyManager.logDataAccess(dataAccessLog)
    req.privacy = { ...req.privacy, dataAccessLog }

    next()
  } catch (error) {
    console.error('Privacy middleware error:', error)
    res.status(500).json({ error: 'Privacy verification failed' })
  }
}

export async function enforcePrivacyPolicy(
  req: PrivacyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const privacyManager = getPrivacyManager()
  const userId = req.user?.id

  if (!userId) {
    next()
    return
  }

  try {
    const settings = await privacyManager.getPrivacySettings(userId)

    // Check if user has enabled anonymous mode
    if (settings.anonymousMode && !req.privacy?.anonymousId) {
      res.status(403).json({ error: 'Anonymous mode required' })
      return
    }

    // Check if user requires blockchain verification
    if (settings.blockchainControl.enabled && !req.privacy?.blockchainVerified) {
      res.status(403).json({ error: 'Blockchain verification required' })
      return
    }

    // Check if user requires biometric authentication
    if (settings.biometricAuth.enabled && !req.privacy?.biometricVerified) {
      res.status(403).json({ error: 'Biometric authentication required' })
      return
    }

    // Check data sharing preferences
    if (req.method === 'GET' && !settings.dataSharing.analytics) {
      // Remove analytics headers
      delete req.headers['x-analytics-id']
    }

    if (req.method === 'POST' && !settings.dataSharing.marketing) {
      // Remove marketing-related data
      delete req.body.marketingPreferences
    }

    if (!settings.dataSharing.thirdParty) {
      // Remove third-party tracking headers
      delete req.headers['x-third-party-id']
    }

    next()
  } catch (error) {
    console.error('Privacy policy enforcement error:', error)
    res.status(500).json({ error: 'Privacy policy enforcement failed' })
  }
}

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const privacyManager = getPrivacyManager()
  const userId = req.user?.id

  if (!userId) {
    next()
    return
  }

  try {
    const accessCount = await privacyManager.getAccessCount(userId)
    const lastAccess = await privacyManager.getLastAccess(userId)

    // Check rate limits based on user's privacy settings
    const settings = await privacyManager.getPrivacySettings(userId)
    const rateLimit = settings.encryption.level === 'military' ? 100 : 1000 // requests per hour
    const timeWindow = 60 * 60 * 1000 // 1 hour

    if (accessCount > rateLimit && Date.now() - lastAccess < timeWindow) {
      res.status(429).json({ error: 'Rate limit exceeded' })
      return
    }

    next()
  } catch (error) {
    console.error('Rate limit middleware error:', error)
    res.status(500).json({ error: 'Rate limit check failed' })
  }
}

export async function dataEncryptionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const privacyManager = getPrivacyManager()
  const userId = req.user?.id

  if (!userId) {
    next()
    return
  }

  try {
    const settings = await privacyManager.getPrivacySettings(userId)

    // Encrypt sensitive data in request body
    if (req.body && settings.encryption.level === 'military') {
      const sensitiveFields = ['password', 'creditCard', 'ssn', 'address']
      for (const field of sensitiveFields) {
        if (req.body[field]) {
          req.body[field] = await privacyManager.encryptData(req.body[field])
        }
      }
    }

    // Decrypt sensitive data in response
    const originalJson = res.json
    res.json = function (body: any) {
      if (body && settings.encryption.level === 'military') {
        const sensitiveFields = ['password', 'creditCard', 'ssn', 'address']
        for (const field of sensitiveFields) {
          if (body[field]) {
            body[field] = privacyManager.decryptData(body[field])
          }
        }
      }
      return originalJson.call(this, body)
    }

    next()
  } catch (error) {
    console.error('Data encryption middleware error:', error)
    res.status(500).json({ error: 'Data encryption failed' })
  }
} 