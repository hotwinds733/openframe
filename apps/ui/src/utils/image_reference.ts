export async function readImageReferenceAsDataUrl(value: string | null): Promise<string | null> {
  if (!value) return null
  if (/^data:/i.test(value)) return value

  if (/^openframe-thumb:/i.test(value)) {
    try {
      const parsed = new URL(value)
      const rawPath = parsed.searchParams.get('path')
      if (!rawPath) return null
      return window.thumbnailsAPI.readBase64(decodeURIComponent(rawPath))
    } catch {
      return null
    }
  }

  return window.thumbnailsAPI.readBase64(value)
}
