# FRC Zone Editor — Implementation Tasks

Agent instructions: work through tasks in order. Each task is self-contained. Read
`.github/prompts/plan-frcZoneEditor.prompt.md` for full context, schemas, and
design decisions before starting. Mark tasks complete (`[x]`) as you finish them.
Run `npm run build` after each phase and fix any TypeScript errors before continuing.

---

## Phase 1 — Scaffold

- [x] **1.1** Initialise the Vite + React + TypeScript project in the repo root:
  ```
  npm create vite@latest . -- --template react-ts
  ```
  Accept prompts to scaffold into the current directory.

- [x] **1.2** Install all runtime and dev dependencies:
  ```
  npm install d3 zustand zundo
  npm install -D @types/d3 tailwindcss @tailwindcss/vite
  ```

- [x] **1.3** Configure Tailwind: add the `@tailwindcss/vite` plugin to `vite.config.ts`
  and add `@import "tailwindcss";` to `src/index.css`. Remove the default Vite
  boilerplate CSS from `App.css` and `index.css` (keep only the Tailwind import).

- [x] **1.4** Set `base: '/Zones/'` in `vite.config.ts` for GitHub Pages deployment.

- [x] **1.5** Source the FRC 2026 field image and place it at `public/field2026.png`.
  Field dimensions: **17.548 m wide × 8.052 m tall**. If the image is not available,
  create a placeholder SVG rectangle of the correct aspect ratio at
  `public/field2026.svg` and use that instead.

- [x] **1.6** Create `public/fieldmap2026.json` with snap points derived from the
  FRC 2026 field drawing. Include at minimum: both alliance walls, all game piece
  stations, and the reef/scoring structure boundaries. Schema:
  ```json
  { "field": "FRC 2026", "snapPoints": [{ "label": "...", "x": 0.0, "y": 0.0 }] }
  ```

- [x] **1.7** Delete the default Vite boilerplate files: `src/App.css`,
  `src/assets/react.svg`, and the contents of `src/App.tsx` (replace with a
  minimal shell). Keep `src/main.tsx` and `src/index.css`.

---

## Phase 2 — Core State

- [x] **2.1** Create `src/types.ts` with exported interfaces:
  `Point`, `SnapPoint`, `Zone` (with fields: `id`, `name`, `priority`, `points`,
  `color`, `visible`). See the State section of the plan for exact shapes.

- [x] **2.2** Create `src/store.ts`: Zustand store wrapped with `zundo` temporal
  middleware. Implement all zone actions (`addZone`, `deleteZone`, `updateZone`,
  `addPoint`, `updatePoint`, `deletePoint`, `selectZone`, `loadZones`) and snap
  actions (`toggleSnap`, `loadSnapPoints`). Use `partialize` to limit undo history
  to the `zones` slice only.

- [x] **2.3** Create `src/history.ts`: export `useUndo`, `useRedo`, `useCanUndo`,
  `useCanRedo` hooks built on top of `useTemporalStore` from `zundo`.

- [x] **2.4** In `src/App.tsx`, add a `useEffect` that fetches `fieldmap2026.json`
  at startup and calls `store.loadSnapPoints()` with the parsed snap points.

---

## Phase 3 — Field Canvas

- [x] **3.1** Create `src/components/FieldCanvas.tsx`:
  - Outer `<div>` fills remaining viewport space (flex-1).
  - Inner `<svg>` sized to container (ResizeObserver), no viewBox — base transform maps field meters → px.
  - `<image>` element renders `FieldImage2026.svg` (real field: **16.541 m × 8.0692 m**).
  - Attach `d3-zoom` to the SVG for pan and scroll-to-zoom (scale 0.5–20×).
  - Expose base transform + zoom via `FieldTransformContext` React context
    so child components can convert between screen and field coordinates.
  - Double-click on the SVG background (not on a polygon) calls `store.addPoint()`
    converting screen coords → field coords (apply coordinate flip:
    `y_field = 8.0692 - y_svg`).

- [x] **3.2** Create `src/components/ZonePolygon.tsx`:
  - Renders one `Zone` as an SVG `<polygon>` (fill with zone color at 30% opacity,
    stroke at full opacity) and a `<circle>` at each vertex (radius scales with base.scale).
  - Attach `d3-drag` to each circle. On drag, call `store.updatePoint()`. On drag
    end, if `snapEnabled`, find the nearest snap point within `snapThreshold` meters
    and call `store.updatePoint()` with the snapped coordinates.
  - Double-click on the polygon fill (not a vertex) inserts a new point at the
    position on the nearest edge via `store.insertPoint()` (find closest edge, insert at that index).
  - Click on the polygon fill calls `store.selectZone()`.
  - Right-click on a vertex calls `store.deletePoint()`.
  - Selected zone polygon gets a thicker stroke and dashed white overlay; vertices get a highlight ring.

- [x] **3.3** Create `src/components/SnapOverlay.tsx`:
  - Renders a `<circle r="0.1">` for each snap point in the store when `snapEnabled`.
  - During an active vertex drag, highlights the nearest snap point within threshold
    by increasing its radius and changing stroke color.

- [x] **3.4** In `FieldCanvas.tsx`, render all visible zones as `<ZonePolygon>`
  components and `<SnapOverlay>` inside the zoom group.

---

## Phase 4 — Sidebar & Toolbar

- [x] **4.1** Create `src/components/ZoneSidebar.tsx`:
  - Fixed-width left panel (e.g. `w-64`).
  - Header row with an **+ Add Zone** button (calls `store.addZone()` which creates a
    zone with a default name, priority 0, random color, and empty points array).
  - Scrollable list of zone rows. Each row contains:
    - Color swatch (`<input type="color">`) bound to `zone.color`
    - Name text input bound to `zone.name`
    - Priority number input (integer ≥ 0) bound to `zone.priority`
    - Eye icon toggle button for `zone.visible`
    - Trash icon delete button (calls `store.deleteZone()`)
  - Clicking anywhere on a row (not a control) calls `store.selectZone()`.
  - Selected row has a distinct background highlight.

- [x] **4.2** Create `src/components/Toolbar.tsx`:
  - Horizontal bar across the top of the app.
  - **Undo** button: calls `useUndo()`; disabled when `!useCanUndo()`.
  - **Redo** button: calls `useRedo()`; disabled when `!useCanRedo()`.
  - **Snap** toggle button: shows current state (`snapEnabled`); calls `store.toggleSnap()`.
  - **Load Fieldmap** button: triggers a hidden `<input type="file" accept=".json">`
    that parses the file and calls `store.loadSnapPoints()`.
  - App title ("FRC Zone Editor") on the left.
  - Import and Export buttons on the right (renders `<ImportButton>` and `<ExportButton>`).

---

## Phase 5 — Import / Export

- [x] **5.1** Create `src/components/ExportButton.tsx`:
  - Button labeled **Export Zones**.
  - On click: read `store.zones`, map each zone to `{ name, priority, points }`
    (strip `id`, `color`, `visible`), wrap in `{ zones: [...] }`, serialize to
    pretty-printed JSON, create a `Blob`, and trigger a browser download named
    `zones.json`.

- [x] **5.2** Create `src/components/ImportButton.tsx`:
  - Button labeled **Load Zones** backed by a hidden `<input type="file" accept=".json">`.
  - On file select: read with `FileReader`, parse JSON, validate that it has a
    `zones` array where each entry has `name` (string), `priority` (number), and
    `points` (array of `{x, y}`).
  - If validation fails, show `alert()` with an error message and abort.
  - If `store.zones` is non-empty, show `confirm()`: *"Loading a file will replace
    your current zones. Continue?"* — abort if cancelled.
  - On confirm: call `store.loadZones()` with the parsed zones (assign new `id`s via
    `crypto.randomUUID()`, assign default `color` and `visible: true`).

---

## Phase 6 — Keyboard Shortcuts & Deploy

- [x] **6.1** In `src/App.tsx`, add a `useEffect` that attaches a `keydown` listener
  to `window`:
  - `Ctrl+Z` → `undo()`
  - `Ctrl+Y` or `Ctrl+Shift+Z` → `redo()`
  - `Delete` or `Backspace` → if a vertex is selected delete it via
    `store.deletePoint()`; else if a zone is selected delete it via
    `store.deleteZone()`.
  Prevent default browser behaviour for all matched shortcuts. Remove the listener
  on cleanup.

- [x] **6.2** Wire up `src/App.tsx` layout: `<Toolbar>` at top, `<ZoneSidebar>` on
  the left, `<FieldCanvas>` filling the remaining space. Use full-viewport height
  (`h-screen`) with flex column/row arrangement.

- [x] **6.3** Create `.github/workflows/deploy.yml`:
  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [main]
  permissions:
    contents: write
  jobs:
    build-and-deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm ci
        - run: npm run build
        - uses: peaceiris/actions-gh-pages@v4
          with:
            github_token: ${{ secrets.GITHUB_TOKEN }}
            publish_dir: ./dist
  ```

- [x] **6.4** Run `npm run build` and confirm zero TypeScript errors and a clean
  `dist/` output. Fix any issues before considering implementation complete.

---

## Verification Checklist

Run through these manually after all phases are complete:

- [ ] `npm run dev` — app loads, field image fills canvas, snap markers visible
- [ ] Add zone → double-click 4+ points → closed polygon renders with correct color
- [ ] Drag vertex → polygon reshapes live; coordinate display (if any) shows meters
- [ ] Drag vertex near snap point with snap ON → snaps to point; snap OFF → no snap
- [ ] Load custom `fieldmap.json` via toolbar → snap points update on canvas
- [ ] Right-click vertex → vertex removed; Ctrl+Z → restored
- [ ] Ctrl+Y → redo restores removed vertex
- [ ] Export → `zones.json` downloads; open in text editor and confirm schema
- [ ] Import the exported `zones.json` → all zones reload and are fully editable
- [ ] Import when zones exist → confirm dialog shown; cancel aborts; accept replaces
- [ ] Delete key with zone selected (no vertex) → zone removed
- [ ] `npm run build` → no errors, `dist/` generated with correct `base` path
- [ ] (Post-deploy) GitHub Actions runs successfully; app live at GitHub Pages URL
