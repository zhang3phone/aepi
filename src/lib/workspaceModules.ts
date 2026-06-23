import type { WorkspaceModule } from '../types'

export interface WorkspaceModuleConfig {
  id: WorkspaceModule
  navGroup: string
  label: string
  shortLabel: string
  title: string
  badge: string
  description: string
  historyLabel: string
}

export const DEFAULT_WORKSPACE_MODULE: WorkspaceModule = 'general'
export const WORKSPACE_MODULE_STORAGE_KEY = 'aepi-active-workspace-module'

const WORKSPACE_MODULE_CONFIGS: Record<WorkspaceModule, WorkspaceModuleConfig> = {
  general: {
    id: 'general',
    navGroup: '生图',
    label: '通用版',
    shortLabel: '通用',
    title: '通用版生图',
    badge: 'General',
    description: '面向 Amazon Listing、A+、参考图和风格板的通用策划与生图流程。',
    historyLabel: '通用版历史',
  },
  clothing: {
    id: 'clothing',
    navGroup: '生图',
    label: '服装版',
    shortLabel: '服装',
    title: '服装版生图',
    badge: 'Clothing',
    description: '以通用版为基础运行，后续服装专用规则只在这里叠加，不影响通用版。',
    historyLabel: '服装版历史',
  },
}

export const WORKSPACE_MODULES = Object.values(WORKSPACE_MODULE_CONFIGS)

export function normalizeWorkspaceModule(value: unknown): WorkspaceModule {
  return value === 'clothing' ? 'clothing' : DEFAULT_WORKSPACE_MODULE
}

export function getWorkspaceModuleConfig(value?: WorkspaceModule | null): WorkspaceModuleConfig {
  return WORKSPACE_MODULE_CONFIGS[normalizeWorkspaceModule(value)]
}

export function getWorkspaceModuleLabel(value?: WorkspaceModule | null) {
  return getWorkspaceModuleConfig(value).label
}

export function belongsToWorkspaceModule(
  value: WorkspaceModule | undefined | null,
  workspaceModule: WorkspaceModule,
) {
  return normalizeWorkspaceModule(value) === workspaceModule
}
