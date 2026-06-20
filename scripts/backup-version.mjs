import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { strToU8, zipSync } from 'fflate'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
const version = String(pkg.version || '0.0.0')
const backupRoot = process.env.DUNCAN_BACKUP_DIR
  ? path.resolve(process.env.DUNCAN_BACKUP_DIR)
  : 'D:\\生图系统'
const backupDir = path.join(backupRoot, '版本备份')

const excludedDirs = new Set([
  '.git',
  '.npm-cache',
  'node_modules',
])

const excludedFiles = new Set([
  '.amazon-image-studio-dev.pid',
  '.amazon-image-studio-proxy.pid',
  '.env',
  '.env.local',
  'dev-server.err.log',
  'dev-server.out.log',
])

function pad(value) {
  return String(value).padStart(2, '0')
}

function getTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function toZipPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function shouldSkip(relativePath, isDirectory) {
  const parts = relativePath.split(path.sep).filter(Boolean)
  if (parts.some((part) => excludedDirs.has(part))) return true

  if (!isDirectory) {
    const baseName = path.basename(relativePath)
    if (excludedFiles.has(baseName)) return true
    if (baseName.startsWith('.env') && baseName !== '.env.local.example') return true
    if (baseName.endsWith('.log')) return true
  }

  return false
}

function collectFiles(currentDir, entries, includedFiles) {
  for (const name of readdirSync(currentDir)) {
    const fullPath = path.join(currentDir, name)
    const relativePath = path.relative(projectRoot, fullPath)
    const stat = statSync(fullPath)
    if (shouldSkip(relativePath, stat.isDirectory())) continue

    if (stat.isDirectory()) {
      collectFiles(fullPath, entries, includedFiles)
      continue
    }

    const zipPath = toZipPath(path.join(`stardust-memory-v${version}`, relativePath))
    entries[zipPath] = readFileSync(fullPath)
    includedFiles.push(toZipPath(relativePath))
  }
}

mkdirSync(backupDir, { recursive: true })

const timestamp = getTimestamp()
const archiveBase = `StardustMemoryImageCenter_v${version}_${timestamp}`
const archivePath = path.join(backupDir, `${archiveBase}.zip`)
const manifestPath = path.join(backupDir, `${archiveBase}.json`)
const latestPath = path.join(backupRoot, '最新备份.txt')

const entries = {}
const includedFiles = []
collectFiles(projectRoot, entries, includedFiles)

const manifest = {
  name: '星辰的回忆生图中心',
  version,
  createdAt: new Date().toISOString(),
  sourceProject: projectRoot,
  archive: archivePath,
  excluded: {
    directories: Array.from(excludedDirs),
    files: Array.from(excludedFiles),
    note: 'Local secrets such as .env.local are excluded from version backups.',
  },
  includedFileCount: includedFiles.length,
}

entries[toZipPath(path.join(`stardust-memory-v${version}`, 'backup-manifest.json'))] = strToU8(
  JSON.stringify(manifest, null, 2),
)

writeFileSync(archivePath, zipSync(entries, { level: 6 }))
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
writeFileSync(
  latestPath,
  [
    '项目：星辰的回忆生图中心',
    `版本：v${version}`,
    `备份时间：${timestamp}`,
    `备份包：${archivePath}`,
    '说明：.env.local 等本地密钥文件未写入备份包。',
    '',
  ].join('\r\n'),
  'utf8',
)

console.log(`Created backup: ${archivePath}`)
console.log(`Manifest: ${manifestPath}`)
