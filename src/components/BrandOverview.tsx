const AEPI_STEPS = [
  { letter: 'A', title: 'Assemble', text: '汇集商品素材、参考图与输出目标' },
  { letter: 'E', title: 'Evaluate', text: '评估平台规则、尺寸要求与合规风险' },
  { letter: 'P', title: 'Prompt', text: '组织提示词、视觉风格与生成参数' },
  { letter: 'I', title: 'Iterate', text: '沉淀记录、复用方案并持续迭代' },
  { letter: '03', title: 'Build 03', text: 'AEPI03-Stardust Memory 内部开发版本' },
]

export default function BrandOverview() {
  return (
    <section data-no-drag-select className="pt-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-950">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">内部开发编号 AEPI03</span>
            <span>Listing / A+ / 参考图 / 风格板</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              AEPI03-Stardust Memory
            </h2>
            <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              多媒体处理工作站
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            面向电商素材生产的内部图像工作台，把商品信息、参考图、视觉风格、尺寸规范和生成记录放在同一个流程里，减少来回切换。
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">核心流程</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">策划、生成、复用</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">输出场景</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">主图、附图、A+</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">处理对象</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">图片、提示词、记录</div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {AEPI_STEPS.map((step) => (
              <div key={`${step.letter}-${step.title}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
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
