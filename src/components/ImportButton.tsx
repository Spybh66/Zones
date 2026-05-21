import { useRef } from 'react'
import { useStore } from '../store'
import type { Zone } from '../types'

interface ZonesFile {
  zones: Array<{
    name: unknown
    priority: unknown
    points: unknown
  }>
}

function validateAndParse(raw: unknown): Zone[] {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as ZonesFile).zones)
  ) {
    throw new Error('JSON must have a top-level "zones" array.')
  }

  const ZONE_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
  ]

  return (raw as ZonesFile).zones.map((entry, i) => {
    if (typeof entry.name !== 'string')
      throw new Error(`Zone ${i}: "name" must be a string.`)
    if (typeof entry.priority !== 'number')
      throw new Error(`Zone ${i}: "priority" must be a number.`)
    if (!Array.isArray(entry.points))
      throw new Error(`Zone ${i}: "points" must be an array.`)

    const points = (entry.points as unknown[]).map((pt, j) => {
      if (
        typeof pt !== 'object' ||
        pt === null ||
        typeof (pt as { x?: unknown }).x !== 'number' ||
        typeof (pt as { y?: unknown }).y !== 'number'
      ) {
        throw new Error(`Zone ${i}, point ${j}: must have numeric "x" and "y".`)
      }
      return { x: (pt as { x: number; y: number }).x, y: (pt as { x: number; y: number }).y }
    })

    return {
      id: crypto.randomUUID(),
      name: entry.name,
      priority: entry.priority,
      points,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
      visible: true,
    } satisfies Zone
  })
}

/** File-input button that loads a zones JSON file into the store. */
export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const zones = useStore((s) => s.zones)
  const loadZones = useStore((s) => s.loadZones)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target!.result as string) as unknown
        const newZones = validateAndParse(parsed)

        if (
          zones.length > 0 &&
          !window.confirm('Loading a file will replace your current zones. Continue?')
        ) {
          return
        }

        loadZones(newZones)
      } catch (err) {
        alert(`Failed to load zones: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        // Allow re-loading the same file
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <button
        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        onClick={() => inputRef.current?.click()}
        title="Load zones from a JSON file"
      >
        ↑ Load Zones
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleChange}
      />
    </>
  )
}
