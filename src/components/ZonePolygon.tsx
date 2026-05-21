import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useStore } from '../store'
import {
  useFieldCtx,
  fieldToSvgPx,
  svgPxToField,
  FIELD_W,
  FIELD_H,
} from './FieldCanvas'
import type { Zone, Point } from '../types'

// ── Geometry helper ───────────────────────────────────────────────────────────

/** Returns the index i such that inserting *after* index i puts the new point
 *  closest to `cursor` on any edge of the polygon. */
function findInsertIndex(points: Point[], cursor: Point): number {
  if (points.length < 2) return 0
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 > 0
      ? Math.max(0, Math.min(1, ((cursor.x - a.x) * dx + (cursor.y - a.y) * dy) / len2))
      : 0
    const cx = a.x + t * dx
    const cy = a.y + t * dy
    const d = (cursor.x - cx) ** 2 + (cursor.y - cy) ** 2
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

// ── Vertex circle with d3-drag ────────────────────────────────────────────────

interface VertexProps {
  zone: Zone
  index: number
  p: Point
  selected: boolean
}

function VertexCircle({ zone, index, p, selected }: VertexProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const { base, zoom, svgRef } = useFieldCtx()

  const updatePoint = useStore((s) => s.updatePoint)
  const deletePoint = useStore((s) => s.deletePoint)
  const snapEnabled = useStore((s) => s.snapEnabled)
  const snapPoints = useStore((s) => s.snapPoints)
  const snapThreshold = useStore((s) => s.snapThreshold)
  const setDraggingAt = useStore((s) => s.setDraggingAt)

  // Keep fast-changing values in refs so the drag handler never goes stale
  const zoomRef = useRef(zoom)
  const baseRef = useRef(base)
  const snapRef = useRef({ snapEnabled, snapPoints, snapThreshold })
  const actionsRef = useRef({ updatePoint, deletePoint, setDraggingAt })

  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { baseRef.current = base }, [base])
  useEffect(() => { snapRef.current = { snapEnabled, snapPoints, snapThreshold } }, [snapEnabled, snapPoints, snapThreshold])
  useEffect(() => { actionsRef.current = { updatePoint, deletePoint, setDraggingAt } }, [updatePoint, deletePoint, setDraggingAt])

  // Attach d3-drag once per circle (re-attach when zone/index identity changes)
  useEffect(() => {
    const circle = circleRef.current
    if (!circle) return

    const getFieldCoords = (sourceEvent: MouseEvent): { x: number; y: number } => {
      const svgEl = svgRef.current!
      const rect = svgEl.getBoundingClientRect()
      const svgX = sourceEvent.clientX - rect.left
      const svgY = sourceEvent.clientY - rect.top
      const [preX, preY] = zoomRef.current.invert([svgX, svgY])
      return svgPxToField(preX, preY, baseRef.current)
    }

    const drag = d3
      .drag<SVGCircleElement, unknown>()
      .on('drag', (event) => {
        const field = getFieldCoords(event.sourceEvent as MouseEvent)
        const clamped = {
          x: Math.max(0, Math.min(FIELD_W, field.x)),
          y: Math.max(0, Math.min(FIELD_H, field.y)),
        }
        actionsRef.current.updatePoint(zone.id, index, clamped)
        actionsRef.current.setDraggingAt(clamped)
      })
      .on('end', (event) => {
        const field = getFieldCoords(event.sourceEvent as MouseEvent)
        const { snapEnabled: se, snapPoints: sp, snapThreshold: st } = snapRef.current
        let snapped: Point | null = null
        if (se) {
          let nearestDist = st
          for (const s of sp) {
            const d = Math.hypot(s.x - field.x, s.y - field.y)
            if (d < nearestDist) {
              nearestDist = d
              snapped = { x: s.x, y: s.y }
            }
          }
        }
        if (snapped) {
          actionsRef.current.updatePoint(zone.id, index, snapped)
        }
        actionsRef.current.setDraggingAt(null)
      })

    d3.select(circle).call(drag)
    return () => {
      d3.select(circle).on('.drag', null)
    }
  }, [zone.id, index, svgRef])

  const [cx, cy] = fieldToSvgPx(p.x, p.y, base)
  const r = Math.max(5, 0.12 * base.scale)

  return (
    <circle
      ref={circleRef}
      cx={cx}
      cy={cy}
      r={r}
      fill={selected ? '#ffffff' : zone.color}
      stroke={selected ? zone.color : '#ffffff'}
      strokeWidth={selected ? 2 : 1}
      style={{ cursor: 'grab', touchAction: 'none' }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        deletePoint(zone.id, index)
      }}
    />
  )
}

// ── Zone polygon ──────────────────────────────────────────────────────────────

interface Props {
  zone: Zone
  selected: boolean
}

export function ZonePolygon({ zone, selected }: Props) {
  const { base, toField } = useFieldCtx()
  const selectZone = useStore((s) => s.selectZone)
  const insertPoint = useStore((s) => s.insertPoint)

  const svgPoints = zone.points
    .map((p) => fieldToSvgPx(p.x, p.y, base).join(','))
    .join(' ')

  const strokeW = Math.max(1, selected ? 3 : 1.5)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectZone(zone.id)
  }

  const handleEdgeDblClick = (e: React.MouseEvent) => {
    if (zone.points.length < 2) return
    e.stopPropagation()
    e.preventDefault()
    const pt = toField(e)
    const idx = findInsertIndex(zone.points, pt)
    insertPoint(zone.id, idx, pt)
  }

  return (
    <g data-zone={zone.id}>
      {/* Filled polygon */}
      <polygon
        points={svgPoints}
        fill={zone.color}
        fillOpacity={0.3}
        stroke={zone.color}
        strokeWidth={strokeW}
        strokeLinejoin="round"
        onClick={handleClick}
        onDoubleClick={handleEdgeDblClick}
        style={{ cursor: 'pointer' }}
      />
      {/* Dashed white outline when selected */}
      {selected && (
        <polygon
          points={svgPoints}
          fill="none"
          stroke="white"
          strokeWidth={1}
          strokeDasharray="6 4"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Vertex circles */}
      {zone.points.map((p, i) => (
        <VertexCircle
          key={i}
          zone={zone}
          index={i}
          p={p}
          selected={selected}
        />
      ))}
    </g>
  )
}
