import { useRef } from 'react'
import { useStore } from '../store'
import { useUndo, useRedo, useCanUndo, useCanRedo } from '../history'
import type { FieldMap } from '../types'

export function Toolbar({
  importButton,
  exportButton,
}: {
  importButton: React.ReactNode
  exportButton: React.ReactNode
}) {
  const snapEnabled = useStore((s) => s.snapEnabled)
  const toggleSnap = useStore((s) => s.toggleSnap)
  const loadSnapPoints = useStore((s) => s.loadSnapPoints)

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const fieldmapInputRef = useRef<HTMLInputElement>(null)

  const handleLoadFieldmap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target!.result as string) as FieldMap
        if (!Array.isArray(data.snapPoints)) throw new Error('Missing snapPoints array')
        loadSnapPoints(data.snapPoints)
      } catch {
        alert('Invalid fieldmap JSON. Expected { "snapPoints": [...] }.')
      }
      // Reset input so the same file can be re-loaded
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
      {/* App title */}
      <span className="text-sm font-bold text-blue-400 mr-2">FRC Zone Editor</span>

      {/* Undo / Redo */}
      <button
        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => undo()}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↩ Undo
      </button>
      <button
        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => redo()}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        ↪ Redo
      </button>

      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Snap toggle */}
      <button
        className={`px-2 py-1 text-xs rounded ${
          snapEnabled
            ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }`}
        onClick={toggleSnap}
        title="Toggle snap to field features"
      >
        {snapEnabled ? '⊙ Snap ON' : '⊙ Snap OFF'}
      </button>

      {/* Load Fieldmap */}
      <button
        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        onClick={() => fieldmapInputRef.current?.click()}
        title="Load custom snap points from a fieldmap JSON file"
      >
        Load Fieldmap
      </button>
      <input
        ref={fieldmapInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLoadFieldmap}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Import / Export (injected as slots) */}
      {importButton}
      {exportButton}
    </header>
  )
}
