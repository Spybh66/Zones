# Plan: FRC Zone Editor Web App

**TL;DR** — A Vite + React + TypeScript web app with an SVG-based field canvas and D3.js drag interactions, deployable to GitHub Pages with zero server requirements. No backend, no installation required. Zones are edited visually and exported as a single JSON file.

---

## GitHub Pages Compatibility

Yes — fully hostable on GitHub Pages with no server or additional hosting:
- `npm run build` produces a fully static `dist/` folder (HTML + JS + CSS + assets only)
- File loading uses the browser-native `<input type="file">` API — no server upload
- File downloading uses `URL.createObjectURL(blob)` — no server needed
- `fieldmap2026.json` and `field2026.png` are bundled as static assets in `public/`
- A GitHub Actions workflow builds on push to `main` and deploys `dist/` to the `gh-pages` branch automatically

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **React + TypeScript + Vite** | Same as Choreo's frontend; excellent SVG support; huge ecosystem |
| Canvas | **SVG** | Polygons are native SVG elements; coordinate math is trivial; no pixel-buffer redraw |
| Drag interactions | **D3.js** (`d3-drag`, `d3-zoom`) | Battle-tested on SVG; used by Choreo; handles pan/zoom + point drag cleanly |
| State | **Zustand** | Simpler than MobX for this scope; minimal boilerplate |
| Undo/Redo | **zundo** | Zustand-native temporal middleware; wraps store to add `undo()`/`redo()` with zero store refactor |
| Styling | **Tailwind CSS** | Utility-first, low overhead; similar visual result to Choreo/PathPlanner |
| Deployment | **GitHub Pages** via Vite static build | Zero-cost hosting; no server needed |

---

## JSON Export Schema (zones file)

```json
{
  "zones": [
    {
      "name": "Coral Station Left",
      "priority": 1,
      "points": [
        { "x": 1.2, "y": 3.5 },
        { "x": 2.8, "y": 3.5 }
      ]
    }
  ]
}
```

Coordinates in **meters**, origin at **bottom-left**, +x right, +y up (standard FRC convention). Colors are editor-only and are not written to the exported JSON.

---

## fieldmap JSON Schema (snap points file)

```json
{
  "field": "FRC 2026",
  "snapPoints": [
    { "label": "Blue Speaker Center", "x": 0.0,    "y": 5.548 },
    { "label": "Red Speaker Center",  "x": 16.541, "y": 5.548 },
    { "label": "Amp Blue",            "x": 1.842,  "y": 8.052 }
  ]
}
```

A default `public/fieldmap2026.json` is shipped with the app based on the FRC 2026 field drawing. Users can also load a custom fieldmap JSON if they want to define their own snap points.

---

## Project Structure

```
src/
  App.tsx                 — two-panel layout: toolbar top, sidebar left, field canvas right
  types.ts                — Zone, Point, SnapPoint TypeScript interfaces
  store.ts                — Zustand store (zones + snap + history state/actions)
  history.ts              — zundo temporal store hooks (undo/redo wiring)
  components/
    FieldCanvas.tsx        — SVG viewport, d3-zoom pan/zoom, coordinate transform context
    ZonePolygon.tsx        — <polygon> + <circle> vertices + d3-drag per point
    ZoneSidebar.tsx        — zone list: add/delete, name/priority/color/visibility
    SnapOverlay.tsx        — renders snap point indicators on the canvas when snap is enabled
    Toolbar.tsx            — snap toggle button, undo/redo buttons, load fieldmap button
    ExportButton.tsx       — JSON → blob → browser download
    ImportButton.tsx       — file input → parse zones JSON → load store (works for new AND existing files)
public/
  field2026.png           — FRC 2026 field image (17.548 m × 8.052 m)
  fieldmap2026.json       — default snap points from the FRC 2026 field drawing
```

---

## State (Zustand + zundo)

```ts
interface Point     { x: number; y: number; }
interface SnapPoint { label: string; x: number; y: number; }

interface Zone {
  id: string;
  name: string;
  priority: number;
  points: Point[];
  color: string;
  visible: boolean;
}

interface Store {
  // Zones
  zones: Zone[];
  selectedZoneId: string | null;
  addZone(): void;
  deleteZone(id: string): void;
  updateZone(id: string, updates: Partial<Zone>): void;
  addPoint(zoneId: string, point: Point): void;
  updatePoint(zoneId: string, index: number, point: Point): void;
  deletePoint(zoneId: string, index: number): void;
  selectZone(id: string | null): void;
  loadZones(zones: Zone[]): void;      // used by ImportButton; replaces current zones

  // Snapping
  snapEnabled: boolean;
  snapThreshold: number;               // meters, default 0.3
  snapPoints: SnapPoint[];
  toggleSnap(): void;
  loadSnapPoints(points: SnapPoint[]): void;
}
```

`zundo` wraps the Zustand store with `temporal` middleware. Only mutations to `zones` are tracked in history (snap settings and selection are excluded from undo scope via `partialize`).

---

## Undo / Redo

- **Library**: `zundo` (`npm install zundo`)
- **Wiring**: `temporal` middleware on `createStore` with `partialize: (s) => ({ zones: s.zones })`
- **`history.ts`**: exports `useUndo` and `useRedo` hooks over `useTemporalStore`
- **Keyboard**: `useEffect` in `App.tsx` registers a `keydown` listener:
  - `Ctrl+Z` → `temporal.undo()`
  - `Ctrl+Y` or `Ctrl+Shift+Z` → `temporal.redo()`
- **Toolbar buttons**: Undo and Redo buttons wired to the same actions; disabled when no past/future states exist

---

## Snapping

- On vertex drag, if `snapEnabled` is true, find the nearest `SnapPoint` within `snapThreshold` meters
- If found, override the drag position with the snap point coordinates
- `SnapOverlay.tsx` renders small `<circle>` markers at every snap point when snap is enabled; the nearest one highlights when a drag is in progress
- Toolbar has a **Snap** toggle button (on/off) and a **Load Fieldmap** button to replace snap points from a user-supplied JSON file
- Default snap points load from `public/fieldmap2026.json` at app startup via `fetch()`

---

## Loading an Existing Zones File

`ImportButton.tsx` handles both initial load and re-load of an existing file:
1. Hidden `<input type="file" accept=".json">` element
2. `FileReader` reads the file, parses JSON, validates schema
3. Calls `store.loadZones(parsedZones)` — replaces current zones entirely
4. All loaded zones are immediately editable: vertices are draggable, properties are editable in the sidebar
5. If zones already exist when a file is loaded, show a browser `confirm()` dialog: *"Loading a file will replace your current zones. Continue?"*
6. Loading a file is a single undo step — one Ctrl+Z restores the prior state

---

## Implementation Phases

### Phase 1 — Scaffold
1. `npm create vite@latest zones -- --template react-ts`
2. Install deps: `d3 zustand zundo @types/d3 tailwindcss`
3. Configure `vite.config.ts` with `base: '/Zones/'` for GitHub Pages
4. Add `public/field2026.png` and `public/fieldmap2026.json`

### Phase 2 — Core State
5. Define `types.ts`: `Point`, `SnapPoint`, `Zone`
6. Implement `store.ts` with `zundo` temporal middleware; all zone actions + snap actions
7. Implement `history.ts`: `useUndo`, `useRedo`, `useCanUndo`, `useCanRedo` hooks

### Phase 3 — Field Canvas
8. `FieldCanvas.tsx`: SVG `viewBox="0 0 17.548 8.052"`, field image as `<image>`, `d3-zoom` for pan/zoom, transform via React context, double-click on background → `addPoint`
9. `ZonePolygon.tsx`: `<polygon>` fill + stroke, `<circle>` per vertex with `d3-drag`; on drag end, apply snap if enabled; double-click on edge adds midpoint
10. `SnapOverlay.tsx`: renders snap point circles; highlights nearest when dragging

### Phase 4 — Sidebar & Toolbar
11. `ZoneSidebar.tsx`: zone rows with name input, priority input, color swatch, eye toggle, trash button, + button; selected row highlighted
12. `Toolbar.tsx`: Undo / Redo buttons (disabled when unavailable), Snap toggle, Load Fieldmap button

### Phase 5 — Import / Export
13. `ExportButton.tsx`: serialize `zones` to JSON schema (omitting `id`, `color`, `visible`) → blob download
14. `ImportButton.tsx`: file input → parse → confirm if zones exist → `store.loadZones()`

### Phase 6 — Keyboard Shortcuts & Deploy
15. `App.tsx`: `keydown` listener for `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`, `Delete`
16. `vite.config.ts`: `base: '/Zones/'`
17. `.github/workflows/deploy.yml`: on push to `main` → `npm ci && npm run build` → deploy `dist/` to `gh-pages`

---

## Interaction Model

| Action | Result |
|---|---|
| Double-click field background | Add vertex to selected zone at cursor |
| Double-click zone edge | Insert vertex on that edge at cursor |
| Drag vertex circle | Move point; snaps if snap is enabled |
| Right-click vertex | Delete that vertex |
| Click polygon fill | Select that zone |
| Click sidebar row | Select that zone |
| Ctrl+Z | Undo last zone mutation |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete key | Remove selected vertex (or selected zone if no vertex focused) |

---

## Key Technical Detail: Coordinate Flip

SVG `y=0` is at the **top**, but FRC `y=0` is at the **bottom**. Apply on every render and pointer event:

```
y_svg   = fieldHeight - y_field
y_field = fieldHeight - y_svg
```

---

## Verification Steps

1. `npm run dev` → app loads, field image fills the canvas, snap point markers visible
2. Add zone → double-click 4 points → polygon renders correctly
3. Drag vertex near a snap point with snap on → vertex snaps; drag with snap off → no snap
4. Load `fieldmap2026.json` via toolbar → snap points update
5. Right-click vertex → vertex removed; Ctrl+Z → vertex restored
6. Export → JSON file downloads with correct `name`, `priority`, `points` in meters (no color/id)
7. Load exported JSON via Import → zones reload and are editable
8. Load JSON when zones exist → confirm dialog appears; accepting replaces zones; Ctrl+Z restores prior state
9. `npm run build` → no TypeScript errors, `dist/` generated
10. Push to `main` → GitHub Actions deploys to `https://<user>.github.io/Zones/`

---

## Decisions & Scope

- **In scope**: polygon zone editing, snap to fieldmap points (toggleable), load/edit existing zones file, undo/redo (Ctrl+Z/Y), JSON import/export, visibility toggle, per-zone color (editor-only)
- **Out of scope**: snap to grid, multi-field-year configurability at runtime, collaborative editing, touch/mobile support
- `id` and `color` are editor-only fields stripped from exported JSON
- Snap threshold (0.3 m default) is a constant; no UI to adjust it in this version
