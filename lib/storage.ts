import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

interface UploadResult {
  url: string
  key: string
}

export function getStorageConfig() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      'Storage is not configured. Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, and CLOUDFLARE_R2_PUBLIC_URL.',
    )
  }

  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: { accessKeyId, secretAccessKey },
    bucket,
    publicUrl,
  }
}

function getClient(): S3Client {
  const config = getStorageConfig()
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
  })
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const config = getStorageConfig()

  await getClient().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    }),
  )

  return {
    url: `${config.publicUrl.replace(/\/$/, '')}/${filename}`,
    key: filename,
  }
}

export async function deleteFile(key: string): Promise<void> {
  const config = getStorageConfig()

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const config = getStorageConfig()
  const client = getClient()
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}