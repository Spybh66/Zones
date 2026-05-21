import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as d3 from 'd3'
import { useStore } from '../store'
import { ZonePolygon } from './ZonePolygon'
import { SnapOverlay } from './SnapOverlay'

// ── Field constants ────────────────────────────────────────────────────────────
export const FIELD_W = 16.541   // meters, x: blue wall → red wall
export const FIELD_H = 8.0692   // meters, y: bottom wall → top wall

// FieldImage2026.svg has 0.5 m of border padding on all four sides
const IMG_PAD = 0.5

// ── Coordinate helpers ─────────────────────────────────────────────────────────

/** Base transform: maps field meters to SVG pixel coordinates. */
export interface BaseXform {
  /** Pixels per meter */
  scale: number
  /** Left edge of field in SVG pixels */
  dx: number
  /** Top edge of field in SVG pixels (SVG y-axis points down) */
  dy: number
}

/**
 * Convert field coordinates (meters, origin bottom-left, y-up)
 * to pre-zoom SVG pixel coordinates (y-down).
 */
export function fieldToSvgPx(x: number, y: number, b: BaseXform): [number, number] {
  return [b.dx + x * b.scale, b.dy + (FIELD_H - y) * b.scale]
}

/**
 * Convert pre-zoom SVG pixel coordinates back to field coordinates.
 */
export function svgPxToField(px: number, py: number, b: BaseXform): { x: number; y: number } {
  return {
    x: (px - b.dx) / b.scale,
    y: FIELD_H - (py - b.dy) / b.scale,
  }
}

// ── Transform context ─────────────────────────────────────────────────────────

export interface FieldCtx {
  base: BaseXform
  zoom: d3.ZoomTransform
  /** Convert any mouse-like event to field coordinates */
  toField: (e: { clientX: number; clientY: number }) => { x: number; y: number }
  svgRef: React.RefObject<SVGSVGElement | null>
}

export const FieldTransformContext = createContext<FieldCtx>({
  base: { scale: 1, dx: 0, dy: 0 },
  zoom: d3.zoomIdentity,
  toField: () => ({ x: 0, y: 0 }),
  svgRef: { current: null },
})

export const useFieldCtx = () => useContext(FieldTransformContext)

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 450 })
  const [zoom, setZoom] = useState<d3.ZoomTransform>(d3.zoomIdentity)

  const zones = useStore((s) => s.zones)
  const selectedZoneId = useStore((s) => s.selectedZoneId)
  const addPoint = useStore((s) => s.addPoint)
  const selectZone = useStore((s) => s.selectZone)
  const deselectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track container size via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute letterbox base transform
  const base = useMemo<BaseXform>(() => {
    if (!size.w || !size.h) return { scale: 1, dx: 0, dy: 0 }
    const fieldAspect = FIELD_W / FIELD_H
    const containerAspect = size.w / size.h
    let scale: number, dx: number, dy: number
    if (containerAspect > fieldAspect) {
      scale = size.h / FIELD_H
      dx = (size.w - FIELD_W * scale) / 2
      dy = 0
    } else {
      scale = size.w / FIELD_W
      dx = 0
      dy = (size.h - FIELD_H * scale) / 2
    }
    return { scale, dx, dy }
  }, [size])

  // Attach d3-zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const behavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 20])
      .on('zoom', (e) => setZoom(e.transform))
    d3.select(svg).call(behavior)
    // Prevent d3's built-in double-click zoom so our double-click adds points
    d3.select(svg).on('dblclick.zoom', null)
    return () => {
      d3.select(svg).on('.zoom', null)
    }
  }, [])

  // Convert client coordinates → field coordinates
  const toField = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = svgRef.current!.getBoundingClientRect()
      const svgX = e.clientX - rect.left
      const svgY = e.clientY - rect.top
      const [preX, preY] = zoom.invert([svgX, svgY])
      return svgPxToField(preX, preY, base)
    },
    [zoom, base],
  )

  const handleBgClick = useCallback(() => {
    if (deselectTimer.current) clearTimeout(deselectTimer.current)
    deselectTimer.current = setTimeout(() => {
      selectZone(null)
      deselectTimer.current = null
    }, 250)
  }, [selectZone])

  const handleDblClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Cancel any pending deselect from the first click of this dblclick
      if (deselectTimer.current) {
        clearTimeout(deselectTimer.current)
        deselectTimer.current = null
      }
      // Ignore if click was on a zone polygon
      if ((e.target as Element).closest('[data-zone]')) return
      if (!selectedZoneId) return
      e.preventDefault()
      const { x, y } = toField(e)
      addPoint(selectedZoneId, {
        x: Math.max(0, Math.min(FIELD_W, x)),
        y: Math.max(0, Math.min(FIELD_H, y)),
      })
    },
    [selectedZoneId, addPoint, toField],
  )

  const ctx = useMemo<FieldCtx>(
    () => ({ base, zoom, toField, svgRef }),
    [base, zoom, toField],
  )

  // Field image position/size (includes 0.5 m border padding)
  const imgX = base.dx - IMG_PAD * base.scale
  const imgY = base.dy - IMG_PAD * base.scale
  const imgW = (FIELD_W + IMG_PAD * 2) * base.scale
  const imgH = (FIELD_H + IMG_PAD * 2) * base.scale

  return (
    <FieldTransformContext.Provider value={ctx}>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-900"
        style={{ minWidth: 0, minHeight: 0 }}
      >
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          onDoubleClick={handleDblClick}
          style={{ display: 'block' }}
        >
          <g transform={zoom.toString()}>
            {/* FRC 2026 field background */}
            <image
              href="/Zones/FieldImage2026.svg"
              x={imgX}
              y={imgY}
              width={imgW}
              height={imgH}
              preserveAspectRatio="none"
            />
            {/* Transparent rect — clicking background deselects active zone */}
            <rect
              x={base.dx}
              y={base.dy}
              width={FIELD_W * base.scale}
              height={FIELD_H * base.scale}
              fill="transparent"
              onClick={handleBgClick}
            />
            {/* Zone polygons (visible only), selected zone rendered last so it sits on top */}
            {zones
              .filter((z) => z.visible)
              .sort((a, b) =>
                a.id === selectedZoneId ? 1 : b.id === selectedZoneId ? -1 : 0,
              )
              .map((z) => (
                <ZonePolygon
                  key={z.id}
                  zone={z}
                  selected={z.id === selectedZoneId}
                />
              ))}
            {/* Snap point overlay */}
            <SnapOverlay />
          </g>
        </svg>
      </div>
    </FieldTransformContext.Provider>
  )
}
