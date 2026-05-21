export interface Point {
  x: number
  y: number
}

export interface SnapPoint {
  label: string
  x: number
  y: number
}

export interface Zone {
  id: string
  name: string
  priority: number
  points: Point[]
  color: string
  visible: boolean
}

/** Shape of fieldmap JSON loaded from /fieldmap2026.json */
export interface FieldMap {
  field: string
  notes?: string
  snapPoints: SnapPoint[]
}
