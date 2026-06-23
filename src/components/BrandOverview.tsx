import type { WorkspaceModule } from '../types'
import { DEFAULT_WORKSPACE_MODULE, getWorkspaceModuleConfig } from '../lib/workspaceModules'

const AEPI_STEPS = [
  { letter: 'A', title: 'Assemble', text: '汇集商品素材、参考图与输出目标' },
  { letter: 'E', title: 'Evaluate', text: '评估平台规则、尺寸要求与合规风险' },
  { letter: 'P', title: 'Prompt', text: '组织提示词、视觉风格与生成参数' },
  { letter: 'I', title: 'Iterate', text: '沉淀记录、复用方案并持续迭代' },
  { letter: '03', title: 'Build 03', text: 'AEPI03-Stardust Memory 内部开发版本' },
]

interface BrandOverviewProps {
  workspaceModule?: WorkspaceModule
}

export default function BrandOverview({ workspaceModule = DEFAULT_WORKSPACE_MODULE }: BrandOverviewProps) {
  const workspace = getWorkspaceModuleConfig(workspaceModule)
  const isClothingWorkspace = workspace.id === 'clothing'
  const shellClass = isClothingWorkspace
    ? 'overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm ring-1 ring-red-500/10 dark:border-blue-300/25 dark:bg-slate-950 dark:ring-red-400/10'
    : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-950'
  const workspaceBadgeClass = isClothingWorkspace
    ? 'rounded-md border border-blue-100 bg-white px-2 py-1 text-blue-700 shadow-sm ring-1 ring-red-500/15 dark:border-blue-300/25 dark:bg-white/[0.06] dark:text-blue-200 dark:ring-red-400/15'
    : 'rounded-md bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200'
  const statCardClass = isClothingWorkspace
    ? 'rounded-xl border border-blue-100 bg-white px-3 py-3 shadow-sm shadow-blue-950/[0.03] dark:border-blue-300/20 dark:bg-white/[0.04]'
    : 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]'
  const stepsPanelClass = isClothingWorkspace
    ? 'border-t border-blue-100 bg-white p-4 dark:border-blue-300/20 dark:bg-white/[0.03]'
    : 'border-t border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]'
  const stepCardClass = isClothingWorkspace
    ? 'rounded-xl border border-blue-100 bg-white px-3 py-3 shadow-sm shadow-blue-950/[0.03] dark:border-blue-300/20 dark:bg-slate-950'
    : 'rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-slate-950'
  const stepIconClass = isClothingWorkspace
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white ring-2 ring-red-500/70 ring-offset-2 ring-offset-white dark:ring-red-400/70 dark:ring-offset-slate-950'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-950'

  return (
    <section data-no-drag-select className="pt-6">
      <div className={shellClass}>
        {isClothingWorkspace && (
          <div className="h-1 bg-gradient-to-r from-red-500 via-white to-blue-600 dark:from-red-400 dark:via-slate-950 dark:to-blue-400" />
        )}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">内部开发编号 AEPI03</span>
            <span>Listing / A+ / 参考图 / 风格板</span>
            <span className={workspaceBadgeClass}>{workspace.label}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              AEPI03-Stardust Memory
            </h2>
            <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {workspace.title} · 多媒体处理工作站
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {workspace.description}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className={statCardClass}>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">核心流程</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">策划、生成、复用</div>
            </div>
            <div className={statCardClass}>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">输出场景</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">主图、附图、A+</div>
            </div>
            <div className={statCardClass}>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">处理对象</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">图片、提示词、记录</div>
            </div>
          </div>
        </div>
        <div className={stepsPanelClass}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {AEPI_STEPS.map((step) => (
              <div key={`${step.letter}-${step.title}`} className={stepCardClass}>
                <div className="flex items-center gap-2">
                  <div className={stepIconClass}>
                    {step.letter}
                  </div>
                  <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</div>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
