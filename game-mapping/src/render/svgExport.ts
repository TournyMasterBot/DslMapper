// src/render/svgExport.ts
import { MapDocV1, Room, Direction, ExitDef, TerrainKind } from "../types";
import { TERRAIN_FILL } from "./terrainPalette";
import { dirUnit, reverseDir } from "./dir";

/** Geometry (keep in sync with OctRenderer) */
const TILE = 40;
const GAP = 4;

function gridToPx(
  cx: number,
  cy: number,
  center: { cx: number; cy: number },
  w: number,
  h: number
) {
  const dx = cx - center.cx;
  const dy = cy - center.cy;
  const pitchX = TILE + GAP;
  const pitchY = TILE + GAP;
  const x = Math.round(w / 2 + dx * pitchX);
  const y = Math.round(h / 2 + dy * pitchY);
  return { x, y };
}

function octPoints(x: number, y: number, size: number) {
  const r = size / 2;
  const k = 0.4142 * r;
  const pts: [number, number][] = [
    [x - k, y - r],
    [x + k, y - r],
    [x + r, y - k],
    [x + r, y + k],
    [x + k, y + r],
    [x - k, y + r],
    [x - r, y + k],
    [x - r, y - k],
  ];
  return pts.map((p) => p.join(",")).join(" ");
}

function arrowHeadPath(x: number, y: number, ux: number, uy: number) {
  const size = 8;
  const px = -uy, py = ux;
  const tipX = x, tipY = y;
  const leftX = x - ux * size - px * (size * 0.5);
  const leftY = y - uy * size - py * (size * 0.5);
  const rightX = x - ux * size + px * (size * 0.5);
  const rightY = y - uy * size + py * (size * 0.5);
  return `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}

type RenderOpts = {
  /** Optional explicit canvas size (otherwise auto-fit to content bounds + padding) */
  width?: number;
  height?: number;
  /** Background color (default dark) */
  background?: string;
};

/**
 * Create an SVG markup string for a single Area and vertical level.
 * Matches the visual OctRenderer (fills, edges, arrowheads, primary outline).
 */
export function renderAreaSVG(
  doc: MapDocV1,
  areaId: string,
  level: number,
  opts: RenderOpts = {}
): string {
  const allRooms = Object.values(doc.rooms);
  const rooms = allRooms.filter(
    (r) => r.category?.areaId === areaId && (r.coords?.vz ?? 0) === level
  );
  if (rooms.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#0f0f10"/><text x="16" y="28" fill="#ddd" font-family="ui-sans-serif,system-ui" font-size="14">No rooms to render.</text></svg>`;
  }

  // center: prefer area's primary, else centroid
  const primaryVnum = doc.meta.catalog?.areas?.[areaId]?.primaryVnum;
  let center = { cx: 0, cy: 0 };
  if (primaryVnum && doc.rooms[primaryVnum]) {
    center = { cx: doc.rooms[primaryVnum].coords.cx, cy: doc.rooms[primaryVnum].coords.cy };
  } else {
    center = {
      cx: Math.round(rooms.reduce((s, r) => s + r.coords.cx, 0) / rooms.length),
      cy: Math.round(rooms.reduce((s, r) => s + r.coords.cy, 0) / rooms.length),
    };
  }

  // Decide canvas size. If not specified, auto-fit to bounds with padding.
  const pitchX = TILE + GAP;
  const pitchY = TILE + GAP;
  const pad = 48;

  // compute logical px positions to get bounds
  let minPxX = Infinity, maxPxX = -Infinity, minPxY = Infinity, maxPxY = -Infinity;
  rooms.forEach((r) => {
    const p = gridToPx(r.coords.cx, r.coords.cy, center, 1000, 1000); // temp
    if (p.x < minPxX) minPxX = p.x;
    if (p.x > maxPxX) maxPxX = p.x;
    if (p.y < minPxY) minPxY = p.y;
    if (p.y > maxPxY) maxPxY = p.y;
  });
  const autoW = Math.max(320, (maxPxX - minPxX) + pad * 2 + TILE);
  const autoH = Math.max(240, (maxPxY - minPxY) + pad * 2 + TILE);
  const width = opts.width ?? Math.round(autoW);
  const height = opts.height ?? Math.round(autoH);

  // We'll re-center using a virtual center at canvas middle.
  const canvasCenter = { cx: center.cx, cy: center.cy };
  const bg = opts.background ?? "#0f0f10";

  // Build lookup for rooms by vnum
  const byVnum = new Map<string, Room>();
  rooms.forEach((r) => byVnum.set(r.vnum, r));

  // Precompute positions
  const pos = new Map<string, { x: number; y: number }>();
  rooms.forEach((r) => {
    pos.set(r.vnum, gridToPx(r.coords.cx, r.coords.cy, canvasCenter, width, height));
  });

  // Edges (use same logic as OctRenderer)
  type Edge = { from: Room; to: Room; dir: Direction; oneWay: boolean };
  const edges: Edge[] = [];
  for (const r of rooms) {
    for (const [dir, ex] of Object.entries(r.exits) as [Direction, ExitDef][]) {
      if (!ex?.to) continue;
      const tgt = byVnum.get(ex.to);
      if (!tgt) continue;
      if (tgt.coords.vz !== level || r.coords.vz !== level) continue;
      edges.push({ from: r, to: tgt, dir, oneWay: !!ex.oneWay });
    }
  }

  let edgeMarkup = "";
  for (const e of edges) {
    const a = pos.get(e.from.vnum)!;
    const b = pos.get(e.to.vnum)!;

    const dx = b.x - a.x, dy = b.y - a.y;
    const { ux, uy } = dirUnit(dx, dy);
    const inset = TILE * 0.35;
    const ax = a.x + ux * inset, ay = a.y + uy * inset;
    const bx = b.x - ux * inset, by = b.y - uy * inset;

    const rev = reverseDir(e.dir);
    const targetHasReverse =
      !!e.to.exits?.[rev] && e.to.exits[rev]?.to === e.from.vnum;

    // forward solid
    edgeMarkup += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>`;
    // arrowhead
    edgeMarkup += `<path d="${arrowHeadPath(bx, by, ux, uy)}" fill="rgba(255,255,255,0.85)"/>`;

    // implied dotted reverse
    if (!e.oneWay && !targetHasReverse) {
      edgeMarkup += `<line x1="${bx}" y1="${by}" x2="${ax}" y2="${ay}" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-dasharray="4 4"/>`;
    }
  }

  // Tiles
  let tileMarkup = "";
  for (const r of rooms) {
    const { x, y } = pos.get(r.vnum)!;
    const isPrimary = !!primaryVnum && r.vnum === primaryVnum;
    const sector: TerrainKind = (r.sector as TerrainKind) ?? TerrainKind.Unknown;
    const fill = (TERRAIN_FILL[sector] ?? "#555") + "E6"; // ~90%

    tileMarkup += `
      <polygon points="${octPoints(x, y, TILE)}"
        fill="${fill}"
        stroke="${isPrimary ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}"
        stroke-width="${isPrimary ? 2 : 1}" />
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" fill="#ddd"
        font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">${(r.label || r.vnum)
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .slice(0, 12)}</text>`;
  }

  const title =
    (doc.meta.catalog?.areas?.[areaId]?.name || areaId) + ` (vz=${level})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <g>${edgeMarkup}</g>
  <g>${tileMarkup}</g>
  <title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>
</svg>`;
}
