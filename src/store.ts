import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Zone, Point, SnapPoint } from './types'

// Auto-assign colors to new zones
const ZONE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface StoreState {
  // ── Zone data (tracked by undo/redo) ──────────────────────────────────
  zones: Zone[]

  // ── Selection (not tracked) ───────────────────────────────────────────
  selectedZoneId: string | null

  // ── Zone actions ──────────────────────────────────────────────────────
  addZone: () => void
  deleteZone: (id: string) => void
  updateZone: (id: string, updates: Partial<Omit<Zone, 'id'>>) => void
  addPoint: (zoneId: string, point: Point) => void
  insertPoint: (zoneId: string, afterIndex: number, point: Point) => void
  updatePoint: (zoneId: string, index: number, point: Point) => void
  deletePoint: (zoneId: string, index: number) => void
  selectZone: (id: string | null) => void
  reorderZones: (fromIndex: number, toIndex: number) => void
  loadZones: (zones: Zone[]) => void

  // ── Snapping (not tracked by undo/redo) ───────────────────────────────
  snapEnabled: boolean
  snapThreshold: number   // meters
  snapPoints: SnapPoint[]
  toggleSnap: () => void
  loadSnapPoints: (points: SnapPoint[]) => void

  // ── Drag state for snap overlay highlighting (not tracked) ────────────
  draggingAt: Point | null
  setDraggingAt: (pt: Point | null) => void
}

export const useStore = create<StoreState>()(
  temporal(
    (set, _get) => ({
      zones: [],
      selectedZoneId: null,

      addZone: () =>
        set((state) => {
          const id = crypto.randomUUID()
          const color = ZONE_COLORS[state.zones.length % ZONE_COLORS.length]
          return {
            zones: [
              ...state.zones,
              {
                id,
                name: `Zone ${state.zones.length + 1}`,
                priority: 0,
                points: [],
                color,
                visible: true,
              },
            ],
            selectedZoneId: id,
          }
        }),

      deleteZone: (id) =>
        set((state) => ({
          zones: state.zones.filter((z) => z.id !== id),
          selectedZoneId:
            state.selectedZoneId === id ? null : state.selectedZoneId,
        })),

      updateZone: (id, updates) =>
        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === id ? { ...z, ...updates } : z,
          ),
        })),

      addPoint: (zoneId, point) =>
        set((state) => ({
          zones: state.zones.map((z) =>
            z.id === zoneId ? { ...z, points: [...z.points, point] } : z,
          ),
        })),

      insertPoint: (zoneId, afterIndex, point) =>
        set((state) => ({
          zones: state.zones.map((z) => {
            if (z.id !== zoneId) return z
            const pts = [...z.points]
            pts.splice(afterIndex + 1, 0, point)
            return { ...z, points: pts }
          }),
        })),
      updatePoint: (zoneId, index, point) =>
        set((state) => ({
          zones: state.zones.map((z) => {
            if (z.id !== zoneId) return z
            const pts = [...z.points]
            pts[index] = point
            return { ...z, points: pts }
          }),
        })),

      deletePoint: (zoneId, index) =>
        set((state) => ({
          zones: state.zones.map((z) => {
            if (z.id !== zoneId) return z
            return { ...z, points: z.points.filter((_, i) => i !== index) }
          }),
        })),

      selectZone: (id) => set({ selectedZoneId: id }),

      reorderZones: (fromIndex, toIndex) =>
        set((state) => {
          const zones = [...state.zones]
          const [moved] = zones.splice(fromIndex, 1)
          zones.splice(toIndex, 0, moved)
          return { zones }
        }),

      loadZones: (zones) => set({ zones, selectedZoneId: null }),

      // ── Snapping ─────────────────────────────────────────────────────
      snapEnabled: true,
      snapThreshold: 0.3,
      snapPoints: [],

      toggleSnap: () =>
        set((state) => ({ snapEnabled: !state.snapEnabled })),

      loadSnapPoints: (points) => set({ snapPoints: points }),

      // ── Drag state ────────────────────────────────────────────────────
      draggingAt: null,
      setDraggingAt: (pt) => set({ draggingAt: pt }),
    }),
    {
      // Only track zone changes in undo/redo history
      partialize: (state) => ({ zones: state.zones }),
    },
  ),
)
