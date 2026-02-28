import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()
const webDirCandidates = [resolve(cwd, 'apps/web'), resolve(cwd, '../web')]
const webDir = webDirCandidates.find((dir) => existsSync(resolve(dir, 'package.json')))

if (!webDir) {
  console.error('Cannot locate apps/web from current working directory')
  process.exit(1)
}

const buildResult = spawnSync('pnpm', ['-C', webDir, 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1)
}

const webDistDir = resolve(webDir, 'dist')
if (!existsSync(webDistDir)) {
  console.error(`Build output not found: ${webDistDir}`)
  process.exit(1)
}

const outputDir = resolve(cwd, 'dist')
rmSync(outputDir, { recursive: true, force: true })
cpSync(webDistDir, outputDir, { recursive: true })
