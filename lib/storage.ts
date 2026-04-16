import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

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
  data: ArrayBuffer | Buffer,
  key: string,
  mimeType: string,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!bucket || !publicUrl) {
    throw new Error(
      'Storage is not configured. Set R2_BUCKET_NAME and R2_PUBLIC_URL.',
    )
  }

  const body = data instanceof ArrayBuffer ? Buffer.from(data) : data

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    }),
  )

  return `${publicUrl.replace(/\/$/, '')}/${key}`
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
