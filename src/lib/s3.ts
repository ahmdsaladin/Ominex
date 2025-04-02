import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from './env'

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export interface UploadOptions {
  contentType: string
  metadata?: Record<string, string>
}

export class S3Service {
  private bucket: string
  private client: S3Client

  constructor() {
    this.bucket = env.AWS_BUCKET_NAME
    this.client = s3Client
  }

  async uploadFile(
    key: string,
    body: Buffer | Blob | string,
    options: UploadOptions
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      Metadata: options.metadata,
    })

    await this.client.send(command)
    return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }

  async uploadImage(
    key: string,
    imageBuffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<string> {
    return this.uploadFile(key, imageBuffer, {
      contentType: 'image/jpeg',
      metadata,
    })
  }

  async uploadVideo(
    key: string,
    videoBuffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<string> {
    return this.uploadFile(key, videoBuffer, {
      contentType: 'video/mp4',
      metadata,
    })
  }

  async uploadAudio(
    key: string,
    audioBuffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<string> {
    return this.uploadFile(key, audioBuffer, {
      contentType: 'audio/mpeg',
      metadata,
    })
  }

  async uploadDocument(
    key: string,
    documentBuffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    return this.uploadFile(key, documentBuffer, {
      contentType,
      metadata,
    })
  }
}

export const s3 = new S3Service() 