import { useStore } from '../store'
import { useFieldCtx, fieldToSvgPx } from './FieldCanvas'

export function SnapOverlay() {
  const { base } = useFieldCtx()
  const snapEnabled = useStore((s) => s.snapEnabled)
  const snapPoints = useStore((s) => s.snapPoints)
  const snapThreshold = useStore((s) => s.snapThreshold)
  const draggingAt = useStore((s) => s.draggingAt)

  if (!snapEnabled || snapPoints.length === 0) return null

  // Find the nearest snap point to the current drag position
  let nearestIdx = -1
  if (draggingAt) {
    let nearestDist = snapThreshold
    for (let i = 0; i < snapPoints.length; i++) {
      const d = Math.hypot(snapPoints[i].x - draggingAt.x, snapPoints[i].y - draggingAt.y)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }
  }

  const baseR = Math.max(3, 0.07 * base.scale)

  return (
    <>
      {snapPoints.map((sp, i) => {
        const [cx, cy] = fieldToSvgPx(sp.x, sp.y, base)
        const isNearest = i === nearestIdx
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={isNearest ? baseR * 2.5 : baseR}
            fill={isNearest ? '#facc1580' : 'none'}
            stroke={isNearest ? '#facc15' : '#94a3b8'}
            strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}
    </>
  )
}
