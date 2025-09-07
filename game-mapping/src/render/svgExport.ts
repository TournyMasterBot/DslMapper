// src/render/svgExport.ts
import { MapDocV1, Room, Direction, ExitDef, TerrainKind } from "../types";
import { TERRAIN_FILL, TERRAIN_ORDER } from "./terrainPalette";
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

type LegendDims = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  padH: number;
  padV: number;
  rowH: number;
  colW: number;
  hdrH: number;
};

function measureLegend(): LegendDims {
  const padV = 12, padH = 12;
  const rowH = 18, colW = 132, hdrH = 22;
  const items = TERRAIN_ORDER.length;
  const cols = items > 7 ? 2 : 1;
  const rows = Math.ceil(items / cols);
  const width = padH * 2 + cols * colW;
  const height = padV * 2 + hdrH + rows * rowH;
  return { width, height, cols, rows, padH, padV, rowH, colW, hdrH };
}

type RenderOpts = {
  width?: number;
  height?: number;
  background?: string;
  includeLegend?: boolean;
  legendCorner?: "tl" | "tr" | "bl" | "br";
  legendMargin?: number;
};

export function renderAreaSVG(
  doc: MapDocV1,
  areaId: string,
  level: number,
  opts: RenderOpts = {}
): string {
  const rooms = Object.values(doc.rooms).filter(
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

  // Base auto-fit size from content bounds
  const pad = 48;
  let minPxX = Infinity, maxPxX = -Infinity, minPxY = Infinity, maxPxY = -Infinity;
  rooms.forEach((r) => {
    const p = gridToPx(r.coords.cx, r.coords.cy, center, 1000, 1000); // temp
    if (p.x < minPxX) minPxX = p.x;
    if (p.x > maxPxX) maxPxX = p.x;
    if (p.y < minPxY) minPxY = p.y;
    if (p.y > maxPxY) maxPxY = p.y;
  });
  const contentW = (maxPxX - minPxX) + TILE;
  const contentH = (maxPxY - minPxY) + TILE;
  let width = opts.width ?? Math.max(320, Math.round(contentW + pad * 2));
  let height = opts.height ?? Math.max(240, Math.round(contentH + pad * 2));

  // Legend reservation
  const includeLegend = opts.includeLegend !== false;
  const corner = opts.legendCorner ?? "tl";
  const legendMargin = opts.legendMargin ?? 12;

  let legendDims: LegendDims | null = null;
  let legendX = 0, legendY = 0;
  let topBand = 0; // amount of reserved space at top
  let bottomBand = 0;

  if (includeLegend) {
    legendDims = measureLegend();
    const band = legendDims.height + legendMargin;

    if (corner === "tl" || corner === "tr") {
      topBand = band;
    } else {
      bottomBand = band;
    }
    height += band;

    // Legend position within its band
    if (corner === "tl") {
      legendX = 12; legendY = 12;
    } else if (corner === "tr") {
      legendX = Math.max(12, width - legendDims.width - 12); legendY = 12;
    } else if (corner === "bl") {
      legendX = 12; legendY = height - legendDims.height - 12;
    } else {
      legendX = Math.max(12, width - legendDims.width - 12);
      legendY = height - legendDims.height - 12;
    }
  }

  const bg = opts.background ?? "#0f0f10";

  // Compute positions centered in *content box* (excluding reserved bands)
  const contentHeight = height - topBand - bottomBand;
  const contentWidth = width; // we only reserve vertical bands

  const byVnum = new Map<string, Room>();
  rooms.forEach((r) => byVnum.set(r.vnum, r));

  const pos = new Map<string, { x: number; y: number }>();
  rooms.forEach((r) => {
    const p = gridToPx(r.coords.cx, r.coords.cy, center, contentWidth, contentHeight);
    pos.set(r.vnum, { x: p.x, y: p.y + topBand }); // shift down by top band
  });

  // Edges
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

    edgeMarkup += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>`;
    edgeMarkup += `<path d="${arrowHeadPath(bx, by, ux, uy)}" fill="rgba(255,255,255,0.85)"/>`;

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
    const fill = (TERRAIN_FILL[sector] ?? "#555") + "E6";

    tileMarkup += `
      <polygon points="${octPoints(x, y, TILE)}"
        fill="${fill}"
        stroke="${isPrimary ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}"
        stroke-width="${isPrimary ? 2 : 1}" />
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" fill="#ddd"
        font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">${escapeText((r.label || r.vnum).toString()).slice(0, 12)}</text>`;
  }

  // Legend panel (drawn in its reserved band)
  let legendMarkup = "";
  if (includeLegend && legendDims) {
    const L = legendDims;
    legendMarkup += `<g transform="translate(${legendX},${legendY})">
      <rect x="0" y="0" width="${L.width}" height="${L.height}" rx="10" ry="10"
        fill="rgba(20,20,24,0.92)" stroke="rgba(255,255,255,0.12)"/>
      <text x="${L.padH}" y="${L.padV + 14}" fill="#ddd" font-size="12" font-weight="600"
        font-family="ui-sans-serif,system-ui">Terrain</text>`;

    for (let c = 0; c < L.cols; c++) {
      for (let r = 0; r < L.rows; r++) {
        const idx = c * L.rows + r;
        if (idx >= TERRAIN_ORDER.length) break;
        const t = TERRAIN_ORDER[idx];
        const sw = TERRAIN_FILL[t] + "E6";
        const x = L.padH + c * L.colW;
        const y = L.padV + L.hdrH + r * L.rowH;

        legendMarkup += `
          <circle cx="${x + 6}" cy="${y + 6}" r="6"
            fill="${sw}" stroke="rgba(255,255,255,0.22)"/>
          <text x="${x + 18}" y="${y + 10}" fill="#ddd" font-size="12"
            font-family="ui-sans-serif,system-ui">${escapeText(t)}</text>`;
      }
    }
    legendMarkup += `</g>`;
  }

  const title = (doc.meta.catalog?.areas?.[areaId]?.name || areaId) + ` (vz=${level})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <g>${edgeMarkup}</g>
  <g>${tileMarkup}</g>
  ${legendMarkup}
  <title>${escapeText(title)}</title>
</svg>`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
