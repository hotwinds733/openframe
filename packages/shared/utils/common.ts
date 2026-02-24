export function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

export function pickFirstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function bytesToDataUrl(bytes: number[], mediaType = 'image/png'): string {
  return `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`
}
