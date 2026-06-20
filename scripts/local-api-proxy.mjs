import { createServer } from 'node:http'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { ProxyAgent, setGlobalDispatcher } from 'undici'

const PROJECT_DIR = process.cwd()
const ENV_FILE = join(PROJECT_DIR, '.env.local')
const SHARED_STYLE_FILE = join(PROJECT_DIR, '.duncan-shared-style-references.json')
const GENERATION_STATS_FILE = join(PROJECT_DIR, '.duncan-generation-stats.json')
const PORT = Number(process.env.DUNCAN_API_PROXY_PORT || 3100)
const DUNCAN_SHARED_STYLE_PATH = '/__duncan/custom-styles'
const DUNCAN_GENERATION_STATS_PATH = '/__duncan/generation-stats'
const GENERATION_STATS_EVENT_LIMIT = 20000

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const result = {}
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[match[1]] = value
  }
  return result
}

const fileEnv = parseEnvFile(ENV_FILE)
const env = { ...fileEnv, ...process.env }

function redactProxyUrl(value) {
  try {
    const url = new URL(value)
    if (url.username || url.password) {
      url.username = url.username ? '***' : ''
      url.password = url.password ? '***' : ''
    }
    return url.toString()
  } catch {
    return value
  }
}

const outboundProxyUrl = String(
  env.DUNCAN_OUTBOUND_PROXY_URL ||
    env.HTTPS_PROXY ||
    env.HTTP_PROXY ||
    env.ALL_PROXY ||
    '',
).trim()

if (outboundProxyUrl) {
  try {
    setGlobalDispatcher(new ProxyAgent(outboundProxyUrl))
    console.log(`Outbound API proxy enabled: ${redactProxyUrl(outboundProxyUrl)}`)
  } catch (error) {
    console.warn(`Outbound API proxy was ignored: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const input = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(input)
    const pathname = url.pathname.replace(/\/+$/, '')
    return `${url.origin}${pathname === '/' ? '' : pathname}`.toLowerCase()
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase()
  }
}

function cleanBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/\/+$/, '')
}

const targets = [
  {
    label: 'OpenAI',
    baseUrl: cleanBaseUrl(env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'),
    apiKey: env.OPENAI_API_KEY || env.SERVER_OPENAI_API_KEY || '',
    apiKeyRequired: true,
  },
  {
    label: 'DeepSeek',
    baseUrl: cleanBaseUrl(env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com'),
    apiKey: env.DEEPSEEK_API_KEY || '',
    apiKeyRequired: true,
  },
  {
    label: 'Local model',
    baseUrl: cleanBaseUrl(env.LOCAL_MODEL_API_BASE_URL || 'http://127.0.0.1:11434/v1'),
    apiKey: env.LOCAL_MODEL_API_KEY || 'local',
    apiKeyRequired: false,
  },
].filter((target) => target.baseUrl)

const allowedTargets = new Map()
for (const target of targets) {
  allowedTargets.set(normalizeBaseUrl(target.baseUrl), target)
}

for (const extraTarget of String(env.DUNCAN_PROXY_ALLOWED_TARGETS || '').split(',')) {
  const baseUrl = cleanBaseUrl(extraTarget)
  if (!baseUrl) continue
  allowedTargets.set(normalizeBaseUrl(baseUrl), {
    label: 'Custom',
    baseUrl,
    apiKey: env.DUNCAN_PROXY_API_KEY || '',
    apiKeyRequired: Boolean(env.DUNCAN_PROXY_API_KEY_REQUIRED),
  })
}

function getDefaultTarget(pathname, bodyText) {
  if (/\/chat\/completions$/i.test(pathname)) {
    try {
      const body = bodyText ? JSON.parse(bodyText) : null
      const model = String(body?.model || '').toLowerCase()
      if (model.startsWith('deepseek')) return allowedTargets.get(normalizeBaseUrl(env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com'))
      if (model.includes(':') || model.includes('qwen') || model.includes('llama')) return allowedTargets.get(normalizeBaseUrl(env.LOCAL_MODEL_API_BASE_URL || 'http://127.0.0.1:11434/v1'))
    } catch {
      // Keep routing by path fallback.
    }
  }
  return allowedTargets.get(normalizeBaseUrl(env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1')) || targets[0]
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeSharedStyleText(value, fallback) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return (text || fallback).slice(0, 100)
}

function normalizeSharedPalette(value) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: 6 }, (_, index) => {
    const color = typeof source[index] === 'string' ? source[index].trim() : ''
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : ['#FFFFFF', '#E5E7EB', '#111827', '#2563EB', '#16A34A', '#F97316'][index]
  })
}

function normalizeSharedStyleReference(value) {
  if (!isRecord(value) || !isRecord(value.editState)) return null
  const id = normalizeSharedStyleText(value.id, '')
  if (!id) return null
  const editState = value.editState
  const normalized = {
    id,
    basePresetId: typeof value.basePresetId === 'string' ? value.basePresetId : null,
    title: normalizeSharedStyleText(value.title, normalizeSharedStyleText(editState.title, 'Custom style')),
    editState: {
      title: normalizeSharedStyleText(editState.title, 'Custom style'),
      palette: normalizeSharedPalette(editState.palette),
      typography: normalizeSharedStyleText(editState.typography, 'Clean sans editorial'),
      lighting: normalizeSharedStyleText(editState.lighting, 'Soft balanced studio light'),
      material: normalizeSharedStyleText(editState.material, 'Smooth product-grade surfaces'),
      density: editState.density === 'minimal' ? 'minimal' : 'rich',
    },
    imageId: normalizeSharedStyleText(value.imageId, ''),
    createdAt: Number.isFinite(value.createdAt) ? Number(value.createdAt) : Date.now(),
    updatedAt: Number.isFinite(value.updatedAt) ? Number(value.updatedAt) : Date.now(),
  }
  return normalized
}

function normalizeSharedStyleReferences(value) {
  const source = Array.isArray(value) ? value : []
  const byId = new Map()
  for (const item of source.slice(0, 100)) {
    const normalized = normalizeSharedStyleReference(item)
    if (!normalized) continue
    const existing = byId.get(normalized.id)
    if (!existing || normalized.updatedAt >= existing.updatedAt) byId.set(normalized.id, normalized)
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

function readSharedStyleReferences() {
  if (!existsSync(SHARED_STYLE_FILE)) return []
  try {
    const payload = JSON.parse(readFileSync(SHARED_STYLE_FILE, 'utf8'))
    return normalizeSharedStyleReferences(payload?.customStyleReferences)
  } catch {
    return []
  }
}

function writeSharedStyleReferences(customStyleReferences) {
  const normalized = normalizeSharedStyleReferences(customStyleReferences)
  writeFileSync(SHARED_STYLE_FILE, JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    customStyleReferences: normalized,
  }, null, 2))
  return normalized
}

function padNumber(value, length = 2) {
  return String(value).padStart(length, '0')
}

function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function formatLocalMonthKey(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`
}

function getIsoWeekKey(date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const utcDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${padNumber(week)}`
}

function sanitizeStatsText(value, fallback = '') {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return (text || fallback).slice(0, 120)
}

function normalizeGenerationEvent(value) {
  if (!isRecord(value)) return null
  const count = Math.trunc(Number(value.count))
  if (!Number.isFinite(count) || count <= 0) return null
  const createdAt = sanitizeStatsText(value.createdAt, new Date().toISOString())
  const eventDate = new Date(createdAt)
  const safeDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate
  const normalized = {
    id: sanitizeStatsText(value.id, `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
    taskId: sanitizeStatsText(value.taskId),
    createdAt: safeDate.toISOString(),
    date: sanitizeStatsText(value.date, formatLocalDateKey(safeDate)),
    week: sanitizeStatsText(value.week, getIsoWeekKey(safeDate)),
    month: sanitizeStatsText(value.month, formatLocalMonthKey(safeDate)),
    count: Math.min(count, 1000),
    sourceMode: sanitizeStatsText(value.sourceMode),
    workflow: sanitizeStatsText(value.workflow),
    amazonSlot: sanitizeStatsText(value.amazonSlot),
    apiProvider: sanitizeStatsText(value.apiProvider),
    apiMode: sanitizeStatsText(value.apiMode),
    apiModel: sanitizeStatsText(value.apiModel),
    apiProfileName: sanitizeStatsText(value.apiProfileName),
  }
  return normalized
}

function normalizeGenerationStatsPayload(value) {
  const events = Array.isArray(value?.events)
    ? value.events.map(normalizeGenerationEvent).filter(Boolean)
    : []
  return {
    version: 1,
    updatedAt: sanitizeStatsText(value?.updatedAt, new Date().toISOString()),
    events: events.slice(-GENERATION_STATS_EVENT_LIMIT),
  }
}

function readGenerationStatsPayload() {
  if (!existsSync(GENERATION_STATS_FILE)) {
    return { version: 1, updatedAt: new Date().toISOString(), events: [] }
  }
  try {
    return normalizeGenerationStatsPayload(JSON.parse(readFileSync(GENERATION_STATS_FILE, 'utf8')))
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), events: [] }
  }
}

function writeGenerationStatsPayload(payload) {
  const normalized = normalizeGenerationStatsPayload({
    ...payload,
    updatedAt: new Date().toISOString(),
  })
  writeFileSync(GENERATION_STATS_FILE, JSON.stringify(normalized, null, 2))
  return normalized
}

function countByKey(events, field) {
  const counts = new Map()
  for (const event of events) {
    const key = event[field]
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + event.count)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => String(b).localeCompare(String(a)))
    .map(([key, count]) => ({ key, count }))
}

function buildGenerationStatsResponse(payload) {
  const now = new Date()
  const todayKey = formatLocalDateKey(now)
  const weekKey = getIsoWeekKey(now)
  const monthKey = formatLocalMonthKey(now)
  const days = countByKey(payload.events, 'date')
  const weeks = countByKey(payload.events, 'week')
  const months = countByKey(payload.events, 'month')
  const findCount = (items, key) => items.find((item) => item.key === key)?.count || 0
  const total = payload.events.reduce((sum, event) => sum + event.count, 0)

  return {
    version: 1,
    updatedAt: payload.updatedAt,
    total,
    today: { key: todayKey, count: findCount(days, todayKey) },
    thisWeek: { key: weekKey, count: findCount(weeks, weekKey) },
    thisMonth: { key: monthKey, count: findCount(months, monthKey) },
    days: days.slice(0, 31),
    weeks: weeks.slice(0, 12),
    months: months.slice(0, 12),
  }
}

function recordGenerationStatsEvent(input) {
  const payload = readGenerationStatsPayload()
  const count = Math.trunc(Number(input?.count))
  if (!Number.isFinite(count) || count <= 0) {
    return { payload, recorded: false, duplicate: false }
  }

  const taskId = sanitizeStatsText(input.taskId)
  if (taskId && payload.events.some((event) => event.taskId === taskId)) {
    return { payload, recorded: false, duplicate: true }
  }

  const now = new Date()
  const event = normalizeGenerationEvent({
    id: `event-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    createdAt: now.toISOString(),
    date: formatLocalDateKey(now),
    week: getIsoWeekKey(now),
    month: formatLocalMonthKey(now),
    count,
    sourceMode: input.sourceMode,
    workflow: input.workflow,
    amazonSlot: input.amazonSlot,
    apiProvider: input.apiProvider,
    apiMode: input.apiMode,
    apiModel: input.apiModel,
    apiProfileName: input.apiProfileName,
  })
  if (!event) return { payload, recorded: false, duplicate: false }

  const nextPayload = writeGenerationStatsPayload({
    ...payload,
    events: [...payload.events, event],
  })
  return { payload: nextPayload, recorded: true, duplicate: false }
}

function handleDuncanEndpoint(req, res, bodyText) {
  const incoming = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
  if (incoming.pathname === DUNCAN_GENERATION_STATS_PATH) {
    if (req.method === 'GET') {
      sendJson(res, 200, buildGenerationStatsResponse(readGenerationStatsPayload()))
      return true
    }

    if (req.method === 'POST') {
      try {
        const payload = bodyText ? JSON.parse(bodyText) : {}
        const result = recordGenerationStatsEvent(payload)
        sendJson(res, 200, {
          ...buildGenerationStatsResponse(result.payload),
          recorded: result.recorded,
          duplicate: result.duplicate,
        })
      } catch (error) {
        sendJson(res, 400, {
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }
      return true
    }

    sendJson(res, 405, { error: { message: 'Method not allowed' } })
    return true
  }

  if (incoming.pathname !== DUNCAN_SHARED_STYLE_PATH) return false

  if (req.method === 'GET') {
    sendJson(res, 200, { customStyleReferences: readSharedStyleReferences() })
    return true
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const payload = bodyText ? JSON.parse(bodyText) : {}
      const customStyleReferences = writeSharedStyleReferences(payload.customStyleReferences)
      sendJson(res, 200, { customStyleReferences })
    } catch (error) {
      sendJson(res, 400, {
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
    return true
  }

  sendJson(res, 405, { error: { message: 'Method not allowed' } })
  return true
}

function copyHeaders(reqHeaders, target) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(reqHeaders)) {
    if (value == null) continue
    const lower = key.toLowerCase()
    if (['host', 'connection', 'content-length', 'accept-encoding'].includes(lower)) continue
    if (lower === 'authorization') continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
  }
  if (target.apiKey) headers.set('Authorization', `Bearer ${target.apiKey}`)
  return headers
}

function buildTargetUrl(reqUrl, bodyText) {
  const incoming = new URL(reqUrl, `http://127.0.0.1:${PORT}`)
  const explicitTarget = incoming.searchParams.get('__target')
  incoming.searchParams.delete('__target')

  const normalizedExplicitTarget = explicitTarget ? normalizeBaseUrl(explicitTarget) : ''
  const target = normalizedExplicitTarget
    ? allowedTargets.get(normalizedExplicitTarget)
    : getDefaultTarget(incoming.pathname, bodyText)

  if (!target) {
    return {
      error: {
        status: 403,
        message: `代理目标未授权：${explicitTarget || incoming.pathname}`,
      },
    }
  }
  if (target.apiKeyRequired && !target.apiKey) {
    return {
      error: {
        status: 500,
        message: `${target.label} API Key 未配置。请在 .env.local 中填写对应密钥。`,
      },
    }
  }

  const cleanPath = incoming.pathname.replace(/^\/+/, '')
  const query = incoming.searchParams.toString()
  return {
    target,
    url: `${target.baseUrl}/${cleanPath}${query ? `?${query}` : ''}`,
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    })
    res.end()
    return
  }

  try {
    const bodyBuffer = await readRequestBody(req)
    const bodyText = bodyBuffer.length ? bodyBuffer.toString('utf8') : ''
    if (handleDuncanEndpoint(req, res, bodyText)) return

    const targetUrl = buildTargetUrl(req.url || '/', bodyText)
    if (targetUrl.error) {
      sendJson(res, targetUrl.error.status, { error: { message: targetUrl.error.message } })
      return
    }

    const upstream = await fetch(targetUrl.url, {
      method: req.method,
      headers: copyHeaders(req.headers, targetUrl.target),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : bodyBuffer,
    })

    const responseHeaders = {}
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lower)) return
      responseHeaders[key] = value
    })
    responseHeaders['Access-Control-Allow-Origin'] = '*'
    res.writeHead(upstream.status, responseHeaders)
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res)
    } else {
      res.end()
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    sendJson(res, 502, {
      error: {
        message: detail,
        hint: '本机后端无法连接上游 API。请检查 OPENAI_API_BASE_URL 是否可访问，或在 .env.local 配置 DUNCAN_OUTBOUND_PROXY_URL 后重启桌面启动 BAT。',
      },
    })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Duncan API proxy listening at http://127.0.0.1:${PORT}`)
  console.log(`Loaded ${allowedTargets.size} allowed API target(s). Secrets stay on this machine.`)
})
