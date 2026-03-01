const WEB_APP_VERSION = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_VERSION || '0.0.0').trim()
const WEB_VERSION_MANIFEST_PATH = '/version.json'

let resolvedWebVersion: string | null = null
let resolvingWebVersionPromise: Promise<string> | null = null

function normalizeVersionText(value: string): string {
  const normalized = (value || '').trim().replace(/^v/i, '')
  return normalized || '0.0.0'
}

export async function resolveWebAppVersion(): Promise<string> {
  if (resolvedWebVersion) return resolvedWebVersion
  if (resolvingWebVersionPromise) return resolvingWebVersionPromise

  resolvingWebVersionPromise = (async () => {
    try {
      const response = await fetch(WEB_VERSION_MANIFEST_PATH, {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`Version source fetch failed: ${response.status}`)
      }
      const parsed = await response.json() as { version?: string }
      const manifestVersion = normalizeVersionText(parsed.version || '')
      resolvedWebVersion = manifestVersion
      return manifestVersion
    } catch {
      const fallbackVersion = normalizeVersionText(WEB_APP_VERSION || '0.0.0')
      resolvedWebVersion = fallbackVersion
      return fallbackVersion
    }
  })()

  try {
    return await resolvingWebVersionPromise
  } finally {
    resolvingWebVersionPromise = null
  }
}
