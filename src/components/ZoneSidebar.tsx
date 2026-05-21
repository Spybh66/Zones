import { useStore } from '../store'

export function ZoneSidebar() {
  const zones = useStore((s) => s.zones)
  const selectedZoneId = useStore((s) => s.selectedZoneId)
  const addZone = useStore((s) => s.addZone)
  const deleteZone = useStore((s) => s.deleteZone)
  const updateZone = useStore((s) => s.updateZone)
  const selectZone = useStore((s) => s.selectZone)

  return (
    <aside className="w-64 flex flex-col bg-[#111] border-r border-[#2a2a2a] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
        <span className="font-heading text-sm text-[#FFCC00]">Zones</span>
        <button
          className="px-2 py-1 text-xs bg-[#FFCC00] hover:bg-[#FFD633] text-black font-semibold rounded"
          onClick={addZone}
        >
          + Add Zone
        </button>
      </div>

      {/* Zone list */}
      <div className="flex-1 overflow-y-auto">
        {zones.length === 0 && (
          <p className="text-xs text-[#888] p-3">
            No zones yet. Add a zone, then double-click the field to place vertices.
          </p>
        )}
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZoneId
          return (
            <div
              key={zone.id}
              className={`flex flex-col gap-1 px-3 py-2 border-b border-[#2a2a2a] cursor-pointer select-none ${
                isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'
              }`}
              onClick={() => selectZone(zone.id)}
            >
              {/* Row 1: color, name, eye, trash */}
              <div className="flex items-center gap-2">
                {/* Color swatch */}
                <input
                  type="color"
                  value={zone.color}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateZone(zone.id, { color: e.target.value })
                  }
                />
                {/* Name */}
                <input
                  type="text"
                  value={zone.name}
                  className="flex-1 min-w-0 bg-black text-sm text-white px-1 py-0.5 rounded border border-[#2a2a2a] focus:outline-none focus:border-[#FFCC00]"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateZone(zone.id, { name: e.target.value })
                  }
                />
                {/* Visibility toggle */}
                <button
                  className="text-[#888] hover:text-white shrink-0"
                  title={zone.visible ? 'Hide zone' : 'Show zone'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateZone(zone.id, { visible: !zone.visible })
                  }}
                >
                  {zone.visible ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
                {/* Delete */}
                <button
                  className="text-[#555] hover:text-red-400 shrink-0"
                  title="Delete zone"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteZone(zone.id)
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
              {/* Row 2: priority */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#888] w-12 shrink-0">Priority</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={zone.priority}
                  className="w-16 bg-black text-sm text-white px-1 py-0.5 rounded border border-[#2a2a2a] focus:outline-none focus:border-[#FFCC00]"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    updateZone(zone.id, {
                      priority: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                />
                <span className="text-xs text-[#888]">{zone.points.length} pts</span>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
