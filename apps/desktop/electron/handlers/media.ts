import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { ipcMain } from 'electron'
import { getDataDir } from '../data_dir'

type AutoEditClip = {
  shotId: string
  path: string
  trimStartSec?: number
  trimEndSec?: number
}

type AutoEditPayload = {
  ratio: '16:9' | '9:16'
  orderedShotIds: string[]
  clips: AutoEditClip[]
}

type AutoEditResult = {
  outputPath: string
}

function isSubPath(targetPath: string, parentPath: string): boolean {
  const resolvedTarget = path.resolve(targetPath)
  const resolvedParent = path.resolve(parentPath) + path.sep
  return resolvedTarget.startsWith(resolvedParent)
}

function ratioFilter(ratio: '16:9' | '9:16'): string {
  if (ratio === '9:16') {
    return 'scale=if(gt(a,9/16),1080,-2):if(gt(a,9/16),-2,1920),pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black'
  }
  return 'scale=if(gt(a,16/9),1920,-2):if(gt(a,16/9),-2,1080),pad=1920:1080:(1920-iw)/2:(1080-ih)/2:black'
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (error) => {
      reject(error)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      const tail = stderr.split('\n').slice(-10).join('\n').trim()
      reject(new Error(tail || `ffmpeg exited with code ${String(code)}`))
    })
  })
}

async function autoEditWithFfmpeg(payload: AutoEditPayload): Promise<AutoEditResult> {
  const videosDir = path.resolve(path.join(getDataDir(), 'videos'))
  const editsDir = path.join(videosDir, 'edits')
  await fs.mkdir(editsDir, { recursive: true })

  const clipByShotId = new Map(payload.clips.map((clip) => [clip.shotId, clip]))
  const orderedClips = payload.orderedShotIds
    .map((shotId) => clipByShotId.get(shotId))
    .filter(Boolean) as AutoEditClip[]

  const selectedClips = orderedClips.length > 0
    ? orderedClips
    : payload.clips

  if (selectedClips.length === 0) {
    throw new Error('No clips available for auto edit')
  }

  for (const clip of selectedClips) {
    if (!isSubPath(clip.path, videosDir)) {
      throw new Error('Clip path is outside videos directory')
    }
    await fs.access(clip.path)
  }

  const runId = Date.now().toString(36)
  const workDir = path.join(editsDir, runId)
  await fs.mkdir(workDir, { recursive: true })

  const normalizedPaths: string[] = []
  for (let index = 0; index < selectedClips.length; index += 1) {
    const clip = selectedClips[index]
    const normalizedPath = path.join(workDir, `clip_${String(index + 1).padStart(3, '0')}.mp4`)

    const inputArgs: string[] = ['-y']

    if (clip.trimStartSec != null && clip.trimStartSec > 0) {
      inputArgs.push('-ss', String(clip.trimStartSec))
    }

    inputArgs.push('-i', clip.path)

    if (clip.trimStartSec != null && clip.trimEndSec != null) {
      const duration = clip.trimEndSec - clip.trimStartSec
      if (duration > 0) {
        inputArgs.push('-t', String(duration))
      }
    }

    inputArgs.push(
      '-an',
      '-vf',
      ratioFilter(payload.ratio),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      normalizedPath,
    )

    await runFfmpeg(inputArgs)
    normalizedPaths.push(normalizedPath)
  }

  const concatListPath = path.join(workDir, 'concat.txt')
  const concatBody = normalizedPaths
    .map((videoPath) => `file '${videoPath.split("'").join("'\\''")}'`)
    .join('\n')
  await fs.writeFile(concatListPath, `${concatBody}\n`, 'utf8')

  const outputPath = path.join(editsDir, `auto_edit_${runId}.mp4`)
  await runFfmpeg([
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ])

  return { outputPath }
}

export function registerMediaHandlers() {
  ipcMain.handle('media:autoEdit', async (_event, payload: AutoEditPayload) => {
    try {
      return await autoEditWithFfmpeg(payload)
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error('ffmpeg not found. Please install ffmpeg and restart OpenFrame.')
      }
      throw error
    }
  })
}
