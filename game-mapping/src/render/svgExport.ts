import { MapDocV1, Room, Direction, ExitDef, TerrainKind } from "../types";
import { TERRAIN_FILL, TERRAIN_ORDER } from "./terrainPalette";
import { dirUnit, reverseDir } from "./dir";

/** Geometry (kept in sync with OctRenderer) */
const TILE = 40;
const GAP = 4;

/* ----------------- positioning & shape helpers ----------------- */
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

/* ----------------- legend layout ----------------- */
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

/* ----------------- label wrapping & collision avoidance ----------------- */
const LABEL_FONT_SIZE = 12;
const LABEL_LINE_STEP = 14;
const CHAR_W = 7;
const LABEL_PAD_X = 8;
const LABEL_PAD_Y = 4;

type Rect = { x: number; y: number; w: number; h: number };

function wrapLabel(s: string, maxChars = 14, maxLines = 3): string[] {
  const words = (s ?? "").toString().split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = (cur ? cur + " " : "") + w;
    if (trial.length > maxChars && cur) {
      out.push(cur);
      cur = w;
      if (out.length >= maxLines) break;
    } else {
      cur = trial;
    }
  }
  if (cur && out.length < maxLines) out.push(cur);
  return out;
}

function buildLabelRects(
  rooms: Room[],
  center: { cx: number; cy: number },
  size: { w: number; h: number },
  yShift = 0
): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  for (const r of rooms) {
    const { x, y } = gridToPx(r.coords.cx, r.coords.cy, center, size.w, size.h);
    const lines = wrapLabel(r.label || r.vnum);
    const maxChars = Math.max(1, ...lines.map((ln) => ln.length));
    const textW = maxChars * CHAR_W;
    const textH = lines.length * LABEL_LINE_STEP;
    const firstY = y + yShift - ((lines.length - 1) * LABEL_LINE_STEP) / 2;
    const boxX = x - textW / 2 - LABEL_PAD_X;
    const boxY = firstY - LABEL_FONT_SIZE - LABEL_PAD_Y;
    const w = textW + LABEL_PAD_X * 2;
    const h = textH + LABEL_PAD_Y * 2;
    rects.set(r.vnum, { x: boxX, y: boxY, w, h });
  }
  return rects;
}

function lineRectIntersectionT(
  x1: number, y1: number, x2: number, y2: number, r: Rect
): [number, number] | null {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    const pi = p[i], qi = q[i];
    if (pi === 0) { if (qi < 0) return null; }
    else {
      const t = qi / pi;
      if (pi < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
      else       { if (t < t0) return null; if (t < t1) t1 = t; }
    }
  }
  return [t0, t1];
}

function lineMinusRects(
  x1: number, y1: number, x2: number, y2: number,
  rects: Rect[], gapPx = 8
): Array<[number, number, number, number]> {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const gapT = L > 0 ? gapPx / L : 0;
  const cuts: Array<[number, number]> = [];
  for (const r of rects) {
    const t = lineRectIntersectionT(x1, y1, x2, y2, r);
    if (!t) continue;
    const [a, b] = t;
    const A = Math.max(0, a - gapT);
    const B = Math.min(1, b + gapT);
    if (B > 0 && A < 1) cuts.push([A, B]);
  }
  if (!cuts.length) return [[x1, y1, x2, y2]];
  cuts.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const c of cuts) {
    if (!merged.length || c[0] > merged[merged.length - 1][1]) {
      merged.push([...c]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], c[1]);
    }
  }
  const out: Array<[number, number, number, number]> = [];
  let prev = 0;
  for (const [a, b] of merged) {
    if (a > prev) {
      out.push([
        x1 + (x2 - x1) * prev,
        y1 + (y2 - y1) * prev,
        x1 + (x2 - x1) * a,
        y1 + (y2 - y1) * a,
      ]);
    }
    prev = Math.max(prev, b);
  }
  if (prev < 1) {
    out.push([x1 + (x2 - x1) * prev, y1 + (y2 - y1) * prev, x2, y2]);
  }
  return out;
}

/* ----------------- door glyphs (paths) ----------------- */
function doorGlyphSimplePath(x: number, y: number, ux: number, uy: number) {
  // short bar perpendicular to the arrow
  const px = -uy, py = ux;
  const half = 6;
  const x1 = x - px * half, y1 = y - py * half;
  const x2 = x + px * half, y2 = y + py * half;
  return {
    under: `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0.9)" stroke-width="5" stroke-linecap="round"/>`,
    over:  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
  };
}

function doorGlyphLockedPath(x: number, y: number) {
  const bodyR = 5;
  const shackleR = 4;
  const shX = x, shY = y - bodyR - 2;
  return `
    <circle cx="${x}" cy="${y}" r="${bodyR + 1.5}" fill="none" stroke="rgba(0,0,0,0.9)" stroke-width="3"/>
    <circle cx="${x}" cy="${y}" r="${bodyR}" fill="none" stroke="#fff" stroke-width="2"/>
    <path d="M ${shX - shackleR} ${shY} a ${shackleR} ${shackleR} 0 0 1 ${2*shackleR} 0"
      fill="none" stroke="rgba(0,0,0,0.9)" stroke-width="3"/>
    <path d="M ${shX - shackleR} ${shY} a ${shackleR} ${shackleR} 0 0 1 ${2*shackleR} 0"
      fill="none" stroke="#fff" stroke-width="2"/>
  `;
}

/* ----------------- public API ----------------- */
type RenderOpts = {
  width?: number;
  height?: number;
  background?: string;
  includeLegend?: boolean;
  legendCorner?: "tl" | "tr" | "bl" | "br";
  legendMargin?: number;
};

/** Single-floor export that mirrors the live renderer. */
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
  const pad = 64;
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
  let width = opts.width ?? Math.max(420, Math.round(contentW + pad * 2));
  let height = opts.height ?? Math.max(320, Math.round(contentH + pad * 2));

  // Legend reservation (top band)
  const includeLegend = opts.includeLegend !== false;
  const corner = opts.legendCorner ?? "tl";
  const legendMargin = opts.legendMargin ?? 12;

  let legendDims: LegendDims | null = null;
  let legendX = 0, legendY = 0;
  let topBand = 0;

  if (includeLegend) {
    legendDims = measureLegend();
    const band = legendDims.height + legendMargin;
    topBand = band;
    height += band;

    // Legend position within the top band
    if (corner === "tl") {
      legendX = 12; legendY = 12;
    } else {
      legendX = Math.max(12, width - legendDims.width - 12); legendY = 12;
    }
  }

  const bg = opts.background ?? "#0f0f10";
  const contentHeight = height - topBand;
  const contentWidth = width;

  const byVnum = new Map<string, Room>();
  rooms.forEach((r) => byVnum.set(r.vnum, r));

  // label rects for collision trimming
  const labelRects = buildLabelRects(rooms, center, { w: contentWidth, h: contentHeight }, topBand);

  // positions
  const pos = new Map<string, { x: number; y: number }>();
  rooms.forEach((r) => {
    const p = gridToPx(r.coords.cx, r.coords.cy, center, contentWidth, contentHeight);
    pos.set(r.vnum, { x: p.x, y: p.y + topBand });
  });

  // Edges (match renderer)
  type Edge = { from: Room; to: Room; dir: Direction; oneWay: boolean; door: ExitDef['door'] };
  const edges: Edge[] = [];
  for (const r of rooms) {
    for (const [dir, ex] of Object.entries(r.exits) as [Direction, ExitDef][]) {
      if (!ex?.to) continue;
      const tgt = byVnum.get(ex.to);
      if (!tgt) continue;
      if (tgt.coords.vz !== level || r.coords.vz !== level) continue;
      edges.push({ from: r, to: tgt, dir, oneWay: !!ex.oneWay, door: ex.door ?? null });
    }
  }

  // Inset distance identical to OctRenderer (oct edge + margin)
  const rEdge = TILE / 2;
  const k = 0.4142 * rEdge;
  const inset = k + 4;

  let edgeMarkup = "";
  const avoidRects = Array.from(labelRects.values());

  for (const e of edges) {
    const a = pos.get(e.from.vnum)!;
    const b = pos.get(e.to.vnum)!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const { ux, uy } = dirUnit(dx, dy);

    const ax = a.x + ux * inset, ay = a.y + uy * inset;
    const bx = b.x - ux * inset, by = b.y - uy * inset;

    // trim around all label rectangles
    const segments = lineMinusRects(ax, ay, bx, by, avoidRects, 6);

    // forward solid line
    for (const [x1, y1, x2, y2] of segments) {
      edgeMarkup += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round"/>`;
    }

    // arrowhead on last segment direction
    const last = segments[segments.length - 1] || [ax, ay, bx, by];
    const [lx1, ly1, lx2, ly2] = last;
    const { ux: lux, uy: luy } = dirUnit(lx2 - lx1, ly2 - ly1);
    edgeMarkup += `<path d="${arrowHeadPath(lx2, ly2, lux, luy)}" fill="rgba(255,255,255,0.9)"/>`;

    // Door glyph (at mid of full unclipped line)
    if (e.door) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if ((e.door as any).type === "simple") {
        const g = doorGlyphSimplePath(mx, my, ux, uy);
        edgeMarkup += g.under + g.over;
      } else if ((e.door as any).type === "locked") {
        edgeMarkup += doorGlyphLockedPath(mx, my);
      }
    }

    // implied dotted reverse if allowed and not explicitly present
    const rev = reverseDir(e.dir);
    const targetHasReverse = !!e.to.exits?.[rev] && e.to.exits[rev]?.to === e.from.vnum;
    if (!e.oneWay && !targetHasReverse) {
      const revSegs = lineMinusRects(bx, by, ax, ay, avoidRects, 6);
      for (const [x1, y1, x2, y2] of revSegs) {
        edgeMarkup += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-dasharray="6 6" stroke-linecap="round"/>`;
      }
    }
  }

  // Tiles + labels that match on-screen (white text w/ black outline)
  let tileMarkup = "";
  for (const r of rooms) {
    const { x, y } = pos.get(r.vnum)!;
    const isPrimary = !!primaryVnum && r.vnum === primaryVnum;
    const sector: TerrainKind = (r.sector as TerrainKind) ?? TerrainKind.Unknown;
    const fill = (TERRAIN_FILL[sector] ?? "#555") + "E6";

    const lines = wrapLabel(r.label || r.vnum);
    const firstY = y - ((lines.length - 1) * LABEL_LINE_STEP) / 2;

    tileMarkup += `
      <polygon points="${octPoints(x, y, TILE)}"
        fill="${fill}"
        stroke="${isPrimary ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}"
        stroke-width="${isPrimary ? 2 : 1}" />`;

    lines.forEach((ln, i) => {
      const ty = firstY + i * LABEL_LINE_STEP;
      tileMarkup += `
        <text x="${x}" y="${ty}" text-anchor="middle"
          font-size="${LABEL_FONT_SIZE}" font-weight="600"
          fill="white" stroke="black" stroke-width="3" paint-order="stroke"
          font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">${escapeText(ln)}</text>`;
    });
  }

  // Legend panel (drawn in reserved top band)
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

  const title = (doc.meta.catalog?.areas?.[areaId]?.name || areaId) + ` — Floor ${level}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="${Math.round(width/2)}" y="24" fill="#d8d8d8" text-anchor="middle"
        font-family="ui-sans-serif,system-ui" font-size="14">${escapeText(title)}</text>
  <g>${edgeMarkup}</g>
  <g>${tileMarkup}</g>
  ${legendMarkup}
  <title>${escapeText(title)}</title>
</svg>`;
}

/**
 * Multi-floor export: Floor 0 on top, then +1, +2… stacked downward,
 * then −1, −2… stacked further downward. Each floor has its own frame
 * and title; legend appears only on the first (top) floor.
 */
export function renderAreaSVGStacked(
  doc: MapDocV1,
  areaId: string,
  opts: RenderOpts = {}
): string {
  // collect floors present in this area
  const byVz = new Map<number, Room[]>();
  for (const r of Object.values(doc.rooms)) {
    if (r.category?.areaId !== areaId) continue;
    const vz = r.coords?.vz ?? 0;
    (byVz.get(vz) ?? byVz.set(vz, []).get(vz)!).push(r);
  }
  if (byVz.size === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#0f0f10"/><text x="16" y="28" fill="#ddd" font-family="ui-sans-serif,system-ui" font-size="14">No rooms to render.</text></svg>`;
  }

  const floors = Array.from(byVz.keys());
  const floorsUp   = floors.filter(v => v > 0).sort((a,b)=>a-b);  // +1, +2…
  const floorsZero = floors.includes(0) ? [0] : [];
  const floorsDown = floors.filter(v => v < 0).sort((a,b)=>b-a);  // -1, -2…

  const ordered = [...floorsZero, ...floorsUp, ...floorsDown]; // 0, +1.., -1..

  // render each floor individually (re-using single floor renderer)
  const parts: { svg: string; w: number; h: number }[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const vz = ordered[i];
    const includeLegend = i === 0 && (opts.includeLegend ?? true);
    const svg = renderAreaSVG(doc, areaId, vz, { ...opts, includeLegend });
    // extract width/height from the svg root to compute total canvas
    const mW = svg.match(/width="(\d+)"/);
    const mH = svg.match(/height="(\d+)"/);
    const w = mW ? parseInt(mW[1], 10) : 800;
    const h = mH ? parseInt(mH[1], 10) : 600;
    // strip xml + root <svg> to <g> content
    const inner = svg.replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>\s*$/s, "");
    parts.push({ svg: `<g>${inner}</g>`, w, h });
  }

  const width = Math.max(...parts.map(p => p.w));
  const gapY = 48;
  const totalH = parts.reduce((s,p)=>s+p.h, 0) + gapY * (parts.length - 1);

  let y = 0;
  let content = "";
  for (const p of parts) {
    const dx = Math.round((width - p.w)/2);
    content += `<g transform="translate(${dx},${y})">${p.svg}</g>`;
    y += p.h + gapY;
  }

  const bg = opts.background ?? "#0f0f10";
  const areaName = doc.meta.catalog?.areas?.[areaId]?.name || areaId;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}">
  <rect width="100%" height="100%" fill="${bg}"/>
  ${content}
  <title>${escapeText(areaName)} — all floors</title>
</svg>`;
}

function escapeText(s: string): string {
  return (s ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
}
