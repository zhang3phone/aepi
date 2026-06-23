import type { WorkspaceModule } from '../types'
import { WORKSPACE_MODULES } from '../lib/workspaceModules'

interface WorkspaceSidebarProps {
  activeModule: WorkspaceModule
  onSelect: (module: WorkspaceModule) => void
}

export default function WorkspaceSidebar({ activeModule, onSelect }: WorkspaceSidebarProps) {
  return (
    <aside data-no-drag-select className="pt-4 lg:pt-6">
      <nav className="lg:sticky lg:top-20">
        <div className="mb-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          生图
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {WORKSPACE_MODULES.map((item) => {
            const isActive = item.id === activeModule
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[10rem] rounded-xl border px-3 py-3 text-left transition lg:min-w-0 ${
                  isActive
                    ? 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-500/10 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  }`}>
                    {item.shortLabel.slice(0, 1)}
                  </span>
                  <span className="min-w-0 text-sm font-semibold">{item.label}</span>
                </div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {item.description}
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
