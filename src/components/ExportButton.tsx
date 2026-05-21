import { useStore } from '../store'

/** Downloads the current zones as a zones.json file.
 *  Editor-only fields (id, color, visible) are stripped from the output.
 */
export function ExportButton() {
  const zones = useStore((s) => s.zones)

  const handleExport = () => {
    const payload = {
      zones: zones.map(({ name, priority, points }) => ({ name, priority, points })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zones.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className="px-2 py-1 text-xs rounded bg-green-700 hover:bg-green-600 text-white"
      onClick={handleExport}
      title="Export zones to zones.json"
    >
      ↓ Export Zones
    </button>
  )
}
