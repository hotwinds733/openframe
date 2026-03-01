export type ObjectStorageProvider = 'local' | 's3' | 'oss' | 'cos'

export type ObjectStorageConfig = {
  provider: ObjectStorageProvider
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  pathPrefix: string
  publicBaseUrl: string
  forcePathStyle: boolean
}

export const DEFAULT_OBJECT_STORAGE_CONFIG: ObjectStorageConfig = {
  provider: 'local',
  endpoint: '',
  region: '',
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  pathPrefix: '',
  publicBaseUrl: '',
  forcePathStyle: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeProvider(value: unknown): ObjectStorageProvider {
  if (value === 's3' || value === 'oss' || value === 'cos') return value
  return 'local'
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeBoolean(value: unknown): boolean {
  return value === true
}

export function normalizeObjectStorageConfig(value: unknown): ObjectStorageConfig {
  if (!isRecord(value)) return { ...DEFAULT_OBJECT_STORAGE_CONFIG }
  return {
    provider: normalizeProvider(value.provider),
    endpoint: normalizeString(value.endpoint),
    region: normalizeString(value.region),
    bucket: normalizeString(value.bucket),
    accessKeyId: normalizeString(value.accessKeyId),
    secretAccessKey: normalizeString(value.secretAccessKey),
    pathPrefix: normalizeString(value.pathPrefix),
    publicBaseUrl: normalizeString(value.publicBaseUrl),
    forcePathStyle: normalizeBoolean(value.forcePathStyle),
  }
}

export function parseObjectStorageConfig(raw: string | null | undefined): ObjectStorageConfig {
  if (!raw) return { ...DEFAULT_OBJECT_STORAGE_CONFIG }
  try {
    return normalizeObjectStorageConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_OBJECT_STORAGE_CONFIG }
  }
}

export function stringifyObjectStorageConfig(config: ObjectStorageConfig): string {
  return JSON.stringify({
    provider: normalizeProvider(config.provider),
    endpoint: config.endpoint.trim(),
    region: config.region.trim(),
    bucket: config.bucket.trim(),
    accessKeyId: config.accessKeyId.trim(),
    secretAccessKey: config.secretAccessKey.trim(),
    pathPrefix: config.pathPrefix.trim(),
    publicBaseUrl: config.publicBaseUrl.trim(),
    forcePathStyle: config.forcePathStyle,
  })
}

export function isObjectStorageEnabled(config: ObjectStorageConfig): boolean {
  return config.provider !== 'local'
    && Boolean(config.endpoint.trim())
    && Boolean(config.bucket.trim())
    && Boolean(config.accessKeyId.trim())
    && Boolean(config.secretAccessKey.trim())
}
