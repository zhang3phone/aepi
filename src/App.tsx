import { useEffect, useState } from 'react'
import { initStore } from './store'
import { useStore } from './store'
import { buildSettingsFromUrlParams, clearUrlSettingParams, hasUrlSettingParams } from './lib/urlSettings'
import { useDockerApiUrlMigrationNotice } from './hooks/useDockerApiUrlMigrationNotice'
import { DEFAULT_WORKSPACE_MODULE, WORKSPACE_MODULE_STORAGE_KEY, normalizeWorkspaceModule } from './lib/workspaceModules'
import type { WorkspaceModule } from './types'
import Header from './components/Header'
import BrandOverview from './components/BrandOverview'
import AmazonPlanner from './components/AmazonPlanner'
import SearchBar from './components/SearchBar'
import TaskGrid from './components/TaskGrid'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import InputBar from './components/InputBar'
import DetailModal from './components/DetailModal'
import Lightbox from './components/Lightbox'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import MaskEditorModal from './components/MaskEditorModal'
import ImageContextMenu from './components/ImageContextMenu'
import { useGlobalClickSuppression } from './lib/clickSuppression'

function readInitialWorkspaceModule(): WorkspaceModule {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_MODULE
  try {
    return normalizeWorkspaceModule(window.localStorage.getItem(WORKSPACE_MODULE_STORAGE_KEY))
  } catch {
    return DEFAULT_WORKSPACE_MODULE
  }
}

export default function App() {
  const setSettings = useStore((s) => s.setSettings)
  const setFilterProductTitle = useStore((s) => s.setFilterProductTitle)
  const clearSelection = useStore((s) => s.clearSelection)
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<WorkspaceModule>(readInitialWorkspaceModule)
  useDockerApiUrlMigrationNotice()
  useGlobalClickSuppression()

  const handleWorkspaceModuleSelect = (workspaceModule: WorkspaceModule) => {
    if (workspaceModule !== activeWorkspaceModule) {
      setFilterProductTitle('')
      clearSelection()
    }
    setActiveWorkspaceModule(workspaceModule)
    try {
      window.localStorage.setItem(WORKSPACE_MODULE_STORAGE_KEY, workspaceModule)
    } catch {
      // Ignore storage failures; the current session can still switch modules.
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextSettings = buildSettingsFromUrlParams(useStore.getState().settings, searchParams)

    setSettings(nextSettings)

    if (hasUrlSettingParams(searchParams)) {
      clearUrlSettingParams(searchParams)

      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    initStore()
    useStore.getState().setAppMode('gallery')
  }, [setSettings])

  useEffect(() => {
    const preventPageImageDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest('img')) {
        e.preventDefault()
      }
    }

    document.addEventListener('dragstart', preventPageImageDrag)
    return () => document.removeEventListener('dragstart', preventPageImageDrag)
  }, [])

  return (
    <>
      <Header />
      <main data-home-main data-drag-select-surface className="home-main-with-dock pb-48 lg:pb-10">
        <div className="safe-area-x mx-auto max-w-[1500px] lg:!px-6">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <WorkspaceSidebar activeModule={activeWorkspaceModule} onSelect={handleWorkspaceModuleSelect} />
            <div className="min-w-0">
              <BrandOverview workspaceModule={activeWorkspaceModule} />
              <AmazonPlanner key={activeWorkspaceModule} workspaceModule={activeWorkspaceModule} />
              <SearchBar workspaceModule={activeWorkspaceModule} />
              <TaskGrid workspaceModule={activeWorkspaceModule} />
            </div>
          </div>
        </div>
      </main>
      <InputBar />
      <DetailModal />
      <Lightbox />
      <SettingsModal />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
    </>
  )
}
