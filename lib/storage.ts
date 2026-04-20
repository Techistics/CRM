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

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!bucket || !publicUrl) {
    throw new Error(
      'Storage is not configured. Set R2_BUCKET_NAME and R2_PUBLIC_URL.',
    )
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    }),
  )

  return {
    url: `${publicUrl.replace(/\/$/, '')}/${filename}`,
    key: filename,
  }
}

export async function deleteFile(key: string): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME

  if (!bucket) {
    throw new Error('Storage is not configured. Set R2_BUCKET_NAME.')
  }

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME

  if (!bucket) {
    throw new Error('Storage is not configured. Set R2_BUCKET_NAME.')
  }

  const client = getClient()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}
