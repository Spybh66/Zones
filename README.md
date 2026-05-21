# FRC Zone Editor

A browser-based tool for visually drawing and exporting named polygon zones on an FRC (FIRST Robotics Competition) field map. Designed to produce a `zones.json` file that can be consumed by robot code or autonomous path planners to define spatial regions on the field (e.g. scoring zones, no-go areas, intake positions).

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Pan / zoom | [D3.js](https://d3js.org/) (`d3-zoom`, `d3-drag`) |
| State management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Undo / redo | [Zundo](https://github.com/charkour/zundo) (temporal middleware for Zustand) |
| Font | [Archivo](https://fonts.google.com/specimen/Archivo) (Google Fonts) |

---

## How It Works

### Coordinate System
The field is treated as a 2D plane measured in meters. The origin is at the **bottom-left** corner (blue alliance wall), with **x** increasing toward the red wall and **y** increasing upward. Field dimensions are 16.541 m × 8.0692 m (2026 season).

Internally, all zone vertex coordinates are stored in field meters. The SVG canvas applies a two-level transform:
1. A **base transform** that letterboxes the field image into the available canvas area.
2. A **D3 zoom transform** on top of the base, allowing the user to pan and zoom freely.

When exporting, only field-meter coordinates are written — all display transforms are stripped.

### State
All zone data lives in a Zustand store. The [Zundo](https://github.com/charkour/zundo) temporal middleware wraps the `zones` array so every discrete edit (add zone, add point, move point, delete, reorder) is undoable. Non-structural state (snap settings, selection, drag highlights) is excluded from undo history.

Drag operations pause history recording for the duration of the drag and resume on mouse-up, so a single drag produces exactly one undo step instead of one per mouse-move frame.

### Snap Points
A `fieldmap2026.json` file (in `/public`) defines named snap points at key field features (e.g. hub openings, trench corners). When snap is enabled, releasing a vertex within the snap threshold snaps it to the nearest listed point. A custom fieldmap JSON can also be loaded from the toolbar.

---

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/Zones/` in your browser.

To build for production:

```bash
npm run build
```

---

## Using the Editor

### Sidebar — Zone Management

| Action | How |
|---|---|
| **Create a zone** | Click **+ Add Zone** at the top of the sidebar |
| **Select a zone** | Click any zone row in the sidebar |
| **Rename a zone** | Edit the text field in the zone row |
| **Change zone color** | Click the color swatch in the zone row |
| **Set priority** | Edit the number field in the zone row (used in export) |
| **Hide / show a zone** | Click the eye icon in the zone row |
| **Delete a zone** | Click the trash icon in the zone row |
| **Reorder zones** | Drag a row by the **⠿** grip handle on the left |

> Zones that are **hidden** cannot be edited. Any attempt to add or delete points on a hidden zone is blocked.

---

### Canvas — Drawing Polygons

A zone must be **selected in the sidebar** before any canvas editing is possible. Only the selected zone can be modified — other zones are read-only regardless of overlap.

| Action | How |
|---|---|
| **Add a vertex** | Double-click anywhere on the field canvas |
| **Insert a vertex on an edge** | Double-click directly on the zone's polygon boundary (inserts at the nearest edge) |
| **Move a vertex** | Click and drag a vertex circle |
| **Delete a vertex** | Right-click a vertex circle |
| **Deselect the active zone** | Single-click the field background |
| **Pan the field** | Click and drag the background |
| **Zoom the field** | Scroll wheel |

> When a zone already has **3 or more vertices**, double-clicking anywhere (background or another zone's area) inserts the new point at the nearest edge of the polygon rather than appending it, keeping the shape coherent.

---

### Toolbar

| Control | Description |
|---|---|
| **↩ Undo** | Undo the last structural change (Ctrl+Z) |
| **↪ Redo** | Redo the last undone change (Ctrl+Y or Ctrl+Shift+Z) |
| **Snap ON / OFF** | Toggle vertex snapping to field feature points |
| **Load Fieldmap** | Load a custom `fieldmap.json` to replace the default snap points |
| **↑ Load Zones** | Import a previously exported `zones.json` file |
| **↓ Export Zones** | Download the current zones as `zones.json` |

**Keyboard shortcuts**

| Key | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete the selected zone (blocked if hidden) |

---

## Export Format

```json
{
  "zones": [
    {
      "name": "Scoring Zone",
      "priority": 1,
      "points": [
        { "x": 1.2, "y": 3.4 },
        { "x": 2.5, "y": 3.4 },
        { "x": 2.5, "y": 5.1 }
      ]
    }
  ]
}
```

Coordinates are in **field meters** (origin bottom-left, y-up). Editor-only fields (`id`, `color`, `visible`) are stripped from the export.

---

## Custom Fieldmap Format

To define your own snap points, create a JSON file with this structure and load it via the toolbar:

```json
{
  "field": "2026 Field Name",
  "snapPoints": [
    { "label": "Speaker Center", "x": 0.0, "y": 5.548 },
    { "label": "Amp Opening",    "x": 1.84, "y": 8.07 }
  ]
}
```
