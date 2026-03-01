export type MediaClip = {
  shotId: string
  path: string
  title?: string
  trimStartSec?: number
  trimEndSec?: number
}

export type TimelineExportPayload = {
  orderedShotIds: string[]
  clips: MediaClip[]
}

export type ExportMergedVideoPayload = TimelineExportPayload & {
  ratio: '16:9' | '9:16'
}

export type ExportFcpxmlPayload = TimelineExportPayload & {
  ratio: '16:9' | '9:16'
  projectName?: string
}

export type ExportEdlPayload = TimelineExportPayload & {
  projectName?: string
  fps?: number
}

function escapeXml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&apos;')
}

function secToFcpxTime(seconds: number, fps = 30): string {
  const frames = Math.max(1, Math.round(seconds * fps))
  return `${String(frames)}/${String(fps)}s`
}

function formatResourceByRatio(
  ratio: '16:9' | '9:16',
): { width: number; height: number; formatName: string } {
  if (ratio === '9:16') {
    return {
      width: 1080,
      height: 1920,
      formatName: 'FFVideoFormatVertical1080x1920p30',
    }
  }
  return {
    width: 1920,
    height: 1080,
    formatName: 'FFVideoFormat1080p30',
  }
}

function sanitizeReelName(value: string): string {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!normalized) return 'OPENFRM'
  return normalized.slice(0, 8)
}

function framesToTimecode(totalFrames: number, fps: number): string {
  const safeFrames = Math.max(0, Math.floor(totalFrames))
  const frames = safeFrames % fps
  const totalSeconds = Math.floor(safeFrames / fps)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const pad2 = (value: number) => String(value).padStart(2, '0')
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}:${pad2(frames)}`
}

function getBasename(pathLike: string): string {
  const normalized = (pathLike || '')
    .split('?')[0]
    .split('#')[0]
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

function getBasenameWithoutExt(pathLike: string): string {
  const basename = getBasename(pathLike)
  const extIndex = basename.lastIndexOf('.')
  if (extIndex <= 0) return basename
  return basename.slice(0, extIndex)
}

export function pickExportClips(payload: TimelineExportPayload): MediaClip[] {
  const clipByShotId = new Map(payload.clips.map((clip) => [clip.shotId, clip]))
  const orderedClips = payload.orderedShotIds
    .map((shotId) => clipByShotId.get(shotId))
    .filter(Boolean) as MediaClip[]

  return orderedClips.length > 0 ? orderedClips : payload.clips
}

type ZipEntry = {
  name: string
  data: Uint8Array
  modifiedAt?: Date
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      if ((value & 1) === 1) {
        value = (value >>> 1) ^ 0xEDB88320
      } else {
        value >>>= 1
      }
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function toDosDateTime(value: Date): { time: number; date: number } {
  const year = Math.max(1980, value.getFullYear())
  const month = value.getMonth() + 1
  const day = value.getDate()
  const hours = value.getHours()
  const minutes = value.getMinutes()
  const seconds = Math.floor(value.getSeconds() / 2)

  const time = ((hours & 0x1F) << 11) | ((minutes & 0x3F) << 5) | (seconds & 0x1F)
  const date = (((year - 1980) & 0x7F) << 9) | ((month & 0x0F) << 5) | (day & 0x1F)
  return { time, date }
}

function sanitizeZipPathSegment(value: string): string {
  const normalized = (value || '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'file'
}

function normalizeZipEntryName(value: string): string {
  const normalized = (value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  const parts = normalized
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => sanitizeZipPathSegment(part))
  return parts.join('/') || 'file'
}

function buildMediaZipEntryName(pathLike: string, index: number): string {
  const basename = getBasename(pathLike)
  const extIndex = basename.lastIndexOf('.')
  const ext = extIndex > 0
    ? basename.slice(extIndex).replace(/[^A-Za-z0-9.]/g, '') || '.mp4'
    : '.mp4'
  const stem = sanitizeZipPathSegment(
    extIndex > 0 ? basename.slice(0, extIndex) : basename,
  )
  return `media/${String(index).padStart(3, '0')}_${stem}${ext}`
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(output).set(bytes)
  return output
}

function buildZipBytes(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const normalizedName = normalizeZipEntryName(entry.name)
    const nameBytes = encoder.encode(normalizedName)
    const content = new Uint8Array(entry.data)
    const crc = crc32(content)
    const dos = toDosDateTime(entry.modifiedAt ?? new Date())

    const localHeader = new Uint8Array(30)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034B50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dos.time, true)
    localView.setUint16(12, dos.date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, content.length, true)
    localView.setUint32(22, content.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    localParts.push(localHeader, nameBytes, content)

    const centralHeader = new Uint8Array(46)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014B50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dos.time, true)
    centralView.setUint16(14, dos.date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, content.length, true)
    centralView.setUint32(24, content.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    centralParts.push(centralHeader, nameBytes)

    offset += localHeader.length + nameBytes.length + content.length
  }

  const centralSize = centralParts.reduce((sum, chunk) => sum + chunk.length, 0)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return concatUint8Arrays([...localParts, ...centralParts, endRecord])
}

export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  const container = document.body ?? document.documentElement
  container.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 1000)
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) return new TextEncoder().encode(dataUrl)

  const meta = dataUrl.slice(0, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)

  if (/;base64/i.test(meta)) {
    const decoded = atob(payload)
    const bytes = new Uint8Array(decoded.length)
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index)
    }
    return bytes
  }

  return new TextEncoder().encode(decodeURIComponent(payload))
}

async function readMediaAsDataUrl(path: string): Promise<string | null> {
  if (!path) return null
  if (/^data:/i.test(path)) return path
  if (!/^(https?:|blob:)/i.test(path)) return null
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new Error('Unable to read media blob'))
      }
      reader.onerror = () => {
        reject(reader.error ?? new Error('Unable to read media blob'))
      }
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function readMediaBytesForZip(pathLike: string): Promise<Uint8Array> {
  if (!pathLike) {
    throw new Error('Source clip is missing')
  }

  if (/^data:/i.test(pathLike)) {
    return dataUrlToBytes(pathLike)
  }

  const normalizedDataUrl = await readMediaAsDataUrl(pathLike)
  if (normalizedDataUrl) {
    return dataUrlToBytes(normalizedDataUrl)
  }

  if (/^(https?:|blob:)/i.test(pathLike)) {
    const response = await fetch(pathLike)
    if (!response.ok) {
      throw new Error(`Failed to fetch clip data: ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }

  throw new Error('Clip path is unsupported in browser export')
}

export async function buildTimelineZipBytes(args: {
  timelineFilename: string
  timelineContent: string
  selectedClips: MediaClip[]
}): Promise<Uint8Array> {
  const entries: ZipEntry[] = [{
    name: args.timelineFilename,
    data: new TextEncoder().encode(args.timelineContent),
  }]

  const clipPathToName = new Map<string, string>()
  let mediaIndex = 0
  for (const clip of args.selectedClips) {
    const key = clip.path
    if (!key || clipPathToName.has(key)) continue
    mediaIndex += 1
    clipPathToName.set(key, buildMediaZipEntryName(key, mediaIndex))
  }

  for (const [clipPath, entryName] of clipPathToName.entries()) {
    const bytes = await readMediaBytesForZip(clipPath)
    entries.push({
      name: entryName,
      data: bytes,
    })
  }

  return buildZipBytes(entries)
}

export function buildEdlContent(payload: ExportEdlPayload): string {
  const selectedClips = pickExportClips(payload)
  if (selectedClips.length === 0) {
    throw new Error('No clips available for EDL export')
  }

  const fps = Math.max(1, Math.floor(payload.fps ?? 30))
  const projectName = (payload.projectName || 'OpenFrame Export').trim() || 'OpenFrame Export'
  const title = sanitizeReelName(projectName)

  let recordStartFrames = 0
  const lines: string[] = [
    `TITLE: ${title}`,
    'FCM: NON-DROP FRAME',
    '',
  ]

  selectedClips.forEach((clip, index) => {
    const trimStartSec = Math.max(0, clip.trimStartSec ?? 0)
    const trimEndRaw = clip.trimEndSec ?? trimStartSec + 3
    const durationSec = Math.max(0.1, trimEndRaw - trimStartSec)

    const sourceInFrames = Math.round(trimStartSec * fps)
    const sourceOutFrames = sourceInFrames + Math.max(1, Math.round(durationSec * fps))
    const recordInFrames = recordStartFrames
    const recordOutFrames = recordInFrames + (sourceOutFrames - sourceInFrames)
    recordStartFrames = recordOutFrames

    const eventNo = String(index + 1).padStart(3, '0')
    const reelName = sanitizeReelName(
      clip.title || getBasenameWithoutExt(clip.path) || `SHOT${eventNo}`,
    )
    const clipName = (clip.title || getBasename(clip.path)).trim() || `Shot ${eventNo}`

    lines.push(
      `${eventNo}  ${reelName} V     C        ${framesToTimecode(sourceInFrames, fps)} ${framesToTimecode(sourceOutFrames, fps)} ${framesToTimecode(recordInFrames, fps)} ${framesToTimecode(recordOutFrames, fps)}`,
      `* FROM CLIP NAME: ${clipName}`,
      `* SOURCE FILE: ${clip.path}`,
      '',
    )
  })

  return `${lines.join('\n')}\n`
}

export function buildFcpxmlContent(payload: ExportFcpxmlPayload): string {
  const selectedClips = pickExportClips(payload)
  if (selectedClips.length === 0) {
    throw new Error('No clips available for FCPXML export')
  }

  const fps = 30
  const format = formatResourceByRatio(payload.ratio)
  const projectName = (payload.projectName || 'OpenFrame Export').trim() || 'OpenFrame Export'

  const assets = selectedClips.map((clip, index) => {
    const trimStartSec = Math.max(0, clip.trimStartSec ?? 0)
    const trimEndRaw = clip.trimEndSec ?? trimStartSec + 3
    const trimDurationSec = Math.max(0.1, trimEndRaw - trimStartSec)
    const fallbackName = `Shot ${String(index + 1)}`
    return {
      id: `r_asset_${String(index + 1)}`,
      name: (clip.title || getBasenameWithoutExt(clip.path) || fallbackName).trim() || fallbackName,
      uid: clip.path,
      mediaSrc: clip.path,
      startSec: trimStartSec,
      durationSec: trimDurationSec,
    }
  })

  let timelineOffsetSec = 0
  const spineClips = assets.map((asset) => {
    const clip = {
      ...asset,
      offsetSec: timelineOffsetSec,
    }
    timelineOffsetSec += asset.durationSec
    return clip
  })

  const totalDurationSec = Math.max(0.1, spineClips.reduce((sum, clip) => sum + clip.durationSec, 0))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE fcpxml>',
    '<fcpxml version="1.11">',
    '  <resources>',
    `    <format id="r_format" name="${escapeXml(format.formatName)}" frameDuration="1/${String(fps)}s" width="${String(format.width)}" height="${String(format.height)}" colorSpace="1-1-1 (Rec. 709)"/>`,
    ...assets.flatMap((asset) => [
      `    <asset id="${asset.id}" name="${escapeXml(asset.name)}" uid="${escapeXml(asset.uid)}" start="${secToFcpxTime(asset.startSec, fps)}" duration="${secToFcpxTime(asset.durationSec, fps)}" hasVideo="1" hasAudio="0" format="r_format">`,
      `      <media-rep kind="original-media" src="${escapeXml(asset.mediaSrc)}"/>`,
      '    </asset>',
    ]),
    '  </resources>',
    '  <library>',
    `    <event name="${escapeXml(projectName)}">`,
    `      <project name="${escapeXml(`${projectName} Timeline`)}">`,
    `        <sequence format="r_format" duration="${secToFcpxTime(totalDurationSec, fps)}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">`,
    '          <spine>',
    ...spineClips.map((clip) =>
      `            <asset-clip name="${escapeXml(clip.name)}" ref="${clip.id}" offset="${secToFcpxTime(clip.offsetSec, fps)}" start="${secToFcpxTime(clip.startSec, fps)}" duration="${secToFcpxTime(clip.durationSec, fps)}"/>`),
    '          </spine>',
    '        </sequence>',
    '      </project>',
    '    </event>',
    '  </library>',
    '</fcpxml>',
  ].join('\n')
}
