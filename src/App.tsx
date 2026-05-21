import { useEffect } from 'react'
import { useStore } from './store'
import { useUndo, useRedo } from './history'
import type { FieldMap } from './types'
import { Toolbar } from './components/Toolbar'
import { ZoneSidebar } from './components/ZoneSidebar'
import { FieldCanvas } from './components/FieldCanvas'
import { ImportButton } from './components/ImportButton'
import { ExportButton } from './components/ExportButton'

export default function App() {
  const loadSnapPoints = useStore((s) => s.loadSnapPoints)
  const selectedZoneId = useStore((s) => s.selectedZoneId)
  const deleteZone = useStore((s) => s.deleteZone)
  const deletePoint = useStore((s) => s.deletePoint)
  const zones = useStore((s) => s.zones)
  const undo = useUndo()
  const redo = useRedo()

  // Load default snap points from public/fieldmap2026.json at startup
  useEffect(() => {
    fetch('./fieldmap2026.json')
      .then((r) => r.json() as Promise<FieldMap>)
      .then((data) => {
        if (Array.isArray(data.snapPoints)) {
          loadSnapPoints(data.snapPoints)
        }
      })
      .catch(console.error)
  }, [loadSnapPoints])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const target = e.target as HTMLElement
      // Ignore shortcuts when typing in an input
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedZoneId) return
        e.preventDefault()
        // If a zone is selected and has no focused vertex, delete the zone
        const zone = zones.find((z) => z.id === selectedZoneId)
        if (zone) deleteZone(selectedZoneId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectedZoneId, zones, deleteZone, deletePoint])

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <Toolbar
        importButton={<ImportButton />}
        exportButton={<ExportButton />}
      />
      <div className="flex flex-1 overflow-hidden">
        <ZoneSidebar />
        <FieldCanvas />
      </div>
    </div>
  )
}
