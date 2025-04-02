import { ethers } from 'ethers'
import { prisma } from '../db'
import { encrypt, decrypt, generateKeyPair, signMessage, verifySignature } from '../crypto'
import { env } from '../env'

export interface PrivacySettings {
  anonymousMode: boolean
  dataSharing: {
    analytics: boolean
    marketing: boolean
    thirdParty: boolean
  }
  blockchainControl: {
    enabled: boolean
    walletAddress?: string
    smartContract?: string
  }
  biometricAuth: {
    enabled: boolean
    type: 'fingerprint' | 'face' | 'voice'
  }
  encryption: {
    level: 'standard' | 'military'
    keyRotation: number // days
  }
}

export interface DataAccessLog {
  id: string
  userId: string
  accessType: 'read' | 'write' | 'delete'
  dataType: string
  timestamp: Date
  ipAddress: string
  userAgent: string
  blockchainHash?: string
}

export class PrivacyManager {
  private provider: ethers.providers.JsonRpcProvider
  private privacyContracts: Map<string, ethers.Contract>
  private anonymousUsers: Map<string, string>
  private dataAccessLogs: DataAccessLog[]

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL)
    this.privacyContracts = new Map()
    this.anonymousUsers = new Map()
    this.dataAccessLogs = []
  }

  async initialize(): Promise<void> {
    // Initialize privacy contracts
    await this.initializePrivacyContracts()
    
    // Start periodic key rotation
    setInterval(() => {
      this.rotateEncryptionKeys()
    }, 24 * 60 * 60 * 1000) // Daily
  }

  private async initializePrivacyContracts(): Promise<void> {
    // Initialize data control contract
    const dataControlContract = new ethers.Contract(
      env.DATA_CONTROL_CONTRACT_ADDRESS,
      env.DATA_CONTROL_ABI,
      this.provider
    )
    this.privacyContracts.set('dataControl', dataControlContract)

    // Initialize authentication contract
    const authContract = new ethers.Contract(
      env.AUTH_CONTRACT_ADDRESS,
      env.AUTH_CONTRACT_ABI,
      this.provider
    )
    this.privacyContracts.set('auth', authContract)
  }

  async setupPrivacySettings(
    userId: string,
    settings: PrivacySettings
  ): Promise<void> {
    // Encrypt settings
    const encryptedSettings = await encrypt(JSON.stringify(settings))

    // Store in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        privacySettings: encryptedSettings,
        lastPrivacyUpdate: new Date(),
      },
    })

    // If blockchain control is enabled, set up smart contract
    if (settings.blockchainControl.enabled && settings.blockchainControl.walletAddress) {
      await this.setupBlockchainControl(userId, settings.blockchainControl)
    }
  }

  private async setupBlockchainControl(
    userId: string,
    blockchainControl: PrivacySettings['blockchainControl']
  ): Promise<void> {
    const dataControlContract = this.privacyContracts.get('dataControl')
    if (!dataControlContract) return

    // Generate key pair for user
    const { publicKey, privateKey } = generateKeyPair()

    // Store public key in smart contract
    await dataControlContract.setUserPublicKey(
      blockchainControl.walletAddress,
      publicKey
    )

    // Store private key securely
    await prisma.user.update({
      where: { id: userId },
      data: {
        blockchainKeys: await encrypt(privateKey),
      },
    })
  }

  async enableAnonymousMode(userId: string): Promise<string> {
    // Generate anonymous ID
    const anonymousId = ethers.utils.id(
      `${userId}-${Date.now()}-${Math.random()}`
    )

    // Store mapping
    this.anonymousUsers.set(anonymousId, userId)

    // Log anonymous mode activation
    await this.logDataAccess({
      userId,
      accessType: 'write',
      dataType: 'privacy_settings',
      ipAddress: 'anonymous',
      userAgent: 'anonymous',
    })

    return anonymousId
  }

  async disableAnonymousMode(anonymousId: string): Promise<void> {
    const userId = this.anonymousUsers.get(anonymousId)
    if (!userId) return

    // Remove mapping
    this.anonymousUsers.delete(anonymousId)

    // Log anonymous mode deactivation
    await this.logDataAccess({
      userId,
      accessType: 'write',
      dataType: 'privacy_settings',
      ipAddress: 'anonymous',
      userAgent: 'anonymous',
    })
  }

  async authenticateWithBiometrics(
    userId: string,
    biometricData: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { biometricHash: true },
    })

    if (!user?.biometricHash) return false

    // Verify biometric data
    return this.verifyBiometricData(biometricData, user.biometricHash)
  }

  private verifyBiometricData(
    biometricData: string,
    storedHash: string
  ): boolean {
    // Implement biometric verification logic
    // This is a placeholder for actual biometric verification
    return true
  }

  async authenticateWithWallet(
    userId: string,
    walletAddress: string,
    signature: string
  ): Promise<boolean> {
    const authContract = this.privacyContracts.get('auth')
    if (!authContract) return false

    // Verify wallet ownership
    const message = `Authenticate Ominex account: ${userId}`
    const recoveredAddress = ethers.utils.recoverAddress(
      ethers.utils.hashMessage(message),
      signature
    )

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return false
    }

    // Update user's wallet address
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress,
        lastWalletAuth: new Date(),
      },
    })

    return true
  }

  private async rotateEncryptionKeys(): Promise<void> {
    const users = await prisma.user.findMany({
      where: {
        privacySettings: {
          path: ['$.encryption.keyRotation'],
          lt: Date.now(),
        },
      },
    })

    for (const user of users) {
      const settings = JSON.parse(await decrypt(user.privacySettings))
      const { publicKey, privateKey } = generateKeyPair()

      // Update encryption keys
      settings.encryption = {
        ...settings.encryption,
        publicKey,
        lastRotation: Date.now(),
      }

      // Store new settings
      await prisma.user.update({
        where: { id: user.id },
        data: {
          privacySettings: await encrypt(JSON.stringify(settings)),
          blockchainKeys: await encrypt(privateKey),
        },
      })
    }
  }

  async logDataAccess(log: DataAccessLog): Promise<void> {
    // Store log in memory
    this.dataAccessLogs.push(log)

    // If blockchain logging is enabled, store hash in smart contract
    const user = await prisma.user.findUnique({
      where: { id: log.userId },
      select: { privacySettings: true },
    })

    if (user) {
      const settings = JSON.parse(await decrypt(user.privacySettings))
      if (settings.blockchainControl.enabled) {
        const dataControlContract = this.privacyContracts.get('dataControl')
        if (dataControlContract) {
          const logHash = ethers.utils.id(JSON.stringify(log))
          await dataControlContract.logDataAccess(
            settings.blockchainControl.walletAddress,
            logHash
          )
          log.blockchainHash = logHash
        }
      }
    }

    // Store log in database
    await prisma.dataAccessLog.create({
      data: log,
    })
  }

  async getPrivacyReport(userId: string): Promise<{
    settings: PrivacySettings
    accessLogs: DataAccessLog[]
    blockchainActivity: any[]
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        dataAccessLogs: true,
      },
    })

    if (!user) throw new Error('User not found')

    const settings = JSON.parse(await decrypt(user.privacySettings))
    const dataControlContract = this.privacyContracts.get('dataControl')

    let blockchainActivity = []
    if (settings.blockchainControl.enabled && dataControlContract) {
      blockchainActivity = await dataControlContract.getUserActivity(
        settings.blockchainControl.walletAddress
      )
    }

    return {
      settings,
      accessLogs: user.dataAccessLogs,
      blockchainActivity,
    }
  }

  async requestDataDeletion(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        posts: true,
        messages: true,
      },
    })

    if (!user) throw new Error('User not found')

    // Delete all user data
    await prisma.$transaction([
      prisma.account.deleteMany({ where: { userId } }),
      prisma.post.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ])

    // Log deletion request
    await this.logDataAccess({
      userId,
      accessType: 'delete',
      dataType: 'all',
      ipAddress: 'anonymous',
      userAgent: 'system',
    })
  }
}

let privacyManager: PrivacyManager | null = null

export function getPrivacyManager(): PrivacyManager {
  if (!privacyManager) {
    privacyManager = new PrivacyManager()
  }
  return privacyManager
} 