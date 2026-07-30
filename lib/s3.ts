import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION?.trim()
const bucket = process.env.AWS_S3_BUCKET?.trim()
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()

export function isS3Configured() {
  return Boolean(region && bucket && accessKeyId && secretAccessKey)
}

function requireS3Config() {
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
    )
  }
  return { region, bucket, accessKeyId, secretAccessKey }
}

function getS3Client() {
  const config = requireS3Config()
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export function getS3Bucket() {
  return requireS3Config().bucket
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._\-\s()]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}

export function buildObjectKey(folder: string, fileName: string) {
  const safeFolder = folder.replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/^\/+|\/+$/g, '')
  const safeName = sanitizeFileName(fileName) || 'document'
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${safeFolder}/${stamp}-${safeName}`
}

export async function uploadObject(params: {
  key: string
  body: Buffer
  contentType: string
}) {
  const client = getS3Client()
  const bucketName = getS3Bucket()
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  )
}

export async function createPreviewUrl(params: {
  key: string
  fileName?: string
  expiresInSeconds?: number
}) {
  const client = getS3Client()
  const bucketName = getS3Bucket()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    ResponseContentDisposition: params.fileName
      ? `inline; filename="${sanitizeFileName(params.fileName)}"`
      : undefined,
  })
  return getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 60 * 15,
  })
}

export async function deleteObject(key: string) {
  const client = getS3Client()
  const bucketName = getS3Bucket()
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  )
}
