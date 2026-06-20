import type { CustomStyleReference } from '../types'
import { isApiProxyAvailable, readClientDevProxyConfig } from './devProxy'

const DEFAULT_PROXY_PREFIX = '/api-proxy'
const SHARED_STYLES_PATH = '/__duncan/custom-styles'

function getSharedStylesEndpoint(): string | null {
  const proxyConfig = readClientDevProxyConfig()
  if (!isApiProxyAvailable(proxyConfig)) return null
  return `${proxyConfig?.prefix ?? DEFAULT_PROXY_PREFIX}${SHARED_STYLES_PATH}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeSharedStyleReferences(value: unknown): CustomStyleReference[] {
  const source = Array.isArray(value) ? value : []
  return source.filter((item): item is CustomStyleReference =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    isRecord(item.editState) &&
    typeof item.imageId === 'string' &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number',
  )
}

export function isSharedCustomStyleLibraryAvailable(): boolean {
  return getSharedStylesEndpoint() != null
}

export async function fetchSharedCustomStyleReferences(): Promise<CustomStyleReference[]> {
  const endpoint = getSharedStylesEndpoint()
  if (!endpoint) return []

  const response = await fetch(endpoint, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json() as { customStyleReferences?: unknown }
  return normalizeSharedStyleReferences(payload.customStyleReferences)
}

export async function saveSharedCustomStyleReferences(customStyleReferences: CustomStyleReference[]): Promise<CustomStyleReference[]> {
  const endpoint = getSharedStylesEndpoint()
  if (!endpoint) return customStyleReferences

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ customStyleReferences }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json() as { customStyleReferences?: unknown }
  return normalizeSharedStyleReferences(payload.customStyleReferences)
}

export function mergeCustomStyleReferences(
  localStyles: CustomStyleReference[],
  sharedStyles: CustomStyleReference[],
): CustomStyleReference[] {
  const byId = new Map<string, CustomStyleReference>()
  for (const style of [...sharedStyles, ...localStyles]) {
    const existing = byId.get(style.id)
    if (!existing || style.updatedAt >= existing.updatedAt) byId.set(style.id, style)
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function areCustomStyleReferencesEqual(a: CustomStyleReference[], b: CustomStyleReference[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => JSON.stringify(item) === JSON.stringify(b[index]))
}
