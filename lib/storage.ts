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
  const isSupabase = !!process.env.SUPABASE_ACCESS_KEY_ID

  if (isSupabase) {
    const projectRef = process.env.SUPABASE_PROJECT_REF
    const accessKeyId = process.env.SUPABASE_ACCESS_KEY_ID
    const secretAccessKey = process.env.SUPABASE_SECRET_ACCESS_KEY
    const bucket = process.env.SUPABASE_BUCKET_NAME
    const region = process.env.SUPABASE_REGION || 'us-east-1'

    if (!projectRef || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'Supabase storage is partially configured. Set SUPABASE_PROJECT_REF, SUPABASE_ACCESS_KEY_ID, SUPABASE_SECRET_ACCESS_KEY, and SUPABASE_BUCKET_NAME.',
      )
    }

    return {
      endpoint: `https://${projectRef}.supabase.co/storage/v1/s3`,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      bucket,
      publicUrl: `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}`,
      forcePathStyle: true,
    }
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      'Storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.',
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
    forcePathStyle: (config as any).forcePathStyle,
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
