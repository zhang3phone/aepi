import { isApiProxyAvailable, readClientDevProxyConfig } from './devProxy'

const DEFAULT_PROXY_PREFIX = '/api-proxy'
const GENERATION_STATS_PATH = '/__duncan/generation-stats'

export interface GenerationStatsBucket {
  key: string
  count: number
}

export interface GenerationStatsSummary {
  version: 1
  updatedAt: string
  total: number
  today: GenerationStatsBucket
  thisWeek: GenerationStatsBucket
  thisMonth: GenerationStatsBucket
  days: GenerationStatsBucket[]
  weeks: GenerationStatsBucket[]
  months: GenerationStatsBucket[]
}

export interface GenerationStatsReportInput {
  taskId?: string
  count: number
  sourceMode?: string
  workflow?: string
  amazonSlot?: string
  apiProvider?: string
  apiMode?: string
  apiModel?: string
  apiProfileName?: string
}

function getGenerationStatsEndpoint(): string | null {
  const proxyConfig = readClientDevProxyConfig()
  if (!isApiProxyAvailable(proxyConfig)) return null
  return `${proxyConfig?.prefix ?? DEFAULT_PROXY_PREFIX}${GENERATION_STATS_PATH}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeBucket(value: unknown): GenerationStatsBucket {
  if (!isRecord(value)) return { key: '', count: 0 }
  return {
    key: typeof value.key === 'string' ? value.key : '',
    count: Number.isFinite(value.count) ? Number(value.count) : 0,
  }
}

function normalizeBucketList(value: unknown): GenerationStatsBucket[] {
  return Array.isArray(value) ? value.map(normalizeBucket).filter((item) => item.key) : []
}

function normalizeGenerationStatsSummary(value: unknown): GenerationStatsSummary {
  const record = isRecord(value) ? value : {}
  return {
    version: 1,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    total: Number.isFinite(record.total) ? Number(record.total) : 0,
    today: normalizeBucket(record.today),
    thisWeek: normalizeBucket(record.thisWeek),
    thisMonth: normalizeBucket(record.thisMonth),
    days: normalizeBucketList(record.days),
    weeks: normalizeBucketList(record.weeks),
    months: normalizeBucketList(record.months),
  }
}

export function isGenerationStatsAvailable(): boolean {
  return getGenerationStatsEndpoint() != null
}

export async function fetchGenerationStats(): Promise<GenerationStatsSummary | null> {
  const endpoint = getGenerationStatsEndpoint()
  if (!endpoint) return null

  const response = await fetch(endpoint, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return normalizeGenerationStatsSummary(await response.json())
}

export async function reportGeneratedImages(input: GenerationStatsReportInput): Promise<GenerationStatsSummary | null> {
  const endpoint = getGenerationStatsEndpoint()
  if (!endpoint || input.count <= 0) return null

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return normalizeGenerationStatsSummary(await response.json())
}
