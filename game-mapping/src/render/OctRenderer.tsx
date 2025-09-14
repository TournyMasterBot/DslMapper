// src/render/OctRenderer.tsx
import React from "react";
import { Room, Direction, ExitDef, TerrainKind } from "../types";
import { dirUnit, reverseDir } from "./dir";
import { TERRAIN_FILL } from "./terrainPalette";

type Props = {
  rooms: Room[];
  level: number;
  focusVnum?: string | null;
  primaryVnum?: string | null;
  centerCx?: number;
  centerCy?: number;
  /** 'container' = fill parent; 'content' = SVG wraps content tightly (scrolls in parent) */
  fit?: "container" | "content";
};

const TILE = 40;
const GAP = 4;
// Extra gap before the arrowhead so it doesn't tuck under the tile.
const HEAD_CLEAR = 10;

/* ---------------- helpers for two coordinate systems ---------------- */
function gridToPx_centered(
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

/** Tight content layout: compute mapping that places min grid at padding and sizes SVG to bounds. */
function makeContentMapper(rooms: Room[], pad = 96) {
  if (rooms.length === 0) {
    return {
      map: (_cx: number, _cy: number) => ({ x: pad + TILE / 2, y: pad + TILE / 2 }),
      width: pad * 2 + TILE,
      height: pad * 2 + TILE,
    };
  }

  let minCx = Infinity,
    maxCx = -Infinity,
    minCy = Infinity,
    maxCy = -Infinity;
  for (const r of rooms) {
    const { cx, cy } = r.coords;
    if (cx < minCx) minCx = cx;
    if (cx > maxCx) maxCx = cx;
    if (cy < minCy) minCy = cy;
    if (cy > maxCy) maxCy = cy;
  }
  const pitchX = TILE + GAP;
  const pitchY = TILE + GAP;
  const cols = maxCx - minCx + 1;
  const rows = maxCy - minCy + 1;

  const contentW = cols * pitchX;
  const contentH = rows * pitchY;

  const width = Math.max(320, Math.round(contentW + pad * 2));
  const height = Math.max(240, Math.round(contentH + pad * 2));

  const map = (cx: number, cy: number) => ({
    x: pad + (cx - minCx) * pitchX + TILE / 2,
    y: pad + (cy - minCy) * pitchY + TILE / 2,
  });

  return { map, width, height };
}

/* ---------------- octagon + label ---------------- */
function Oct({
  x,
  y,
  size,
  label,
  isPrimary,
  sectorFill,
}: {
  x: number;
  y: number;
  size: number;
  label: string;
  isPrimary: boolean;
  sectorFill: string;
}) {
  const r = size / 2;
  const k = 0.4142 * r;
  const pts = [
    [x - k, y - r],
    [x + k, y - r],
    [x + r, y - k],
    [x + r, y + k],
    [x + k, y + r],
    [x - k, y + r],
    [x - r, y + k],
    [x - r, y - k],
  ]
    .map((p) => p.join(","))
    .join(" ");

  const wrapLabel = (text: string, maxChars = 14, maxLines = 3) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars && cur) {
        lines.push(cur.trim());
        cur = w;
      } else {
        cur += " " + w;
      }
    }
    if (cur) lines.push(cur.trim());
    return lines.slice(0, maxLines);
  };
  const lines = wrapLabel(label);

  return (
    <>
      <polygon
        points={pts}
        fill={`${sectorFill}E6`}
        stroke={isPrimary ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}
        strokeWidth={isPrimary ? 2 : 1}
      />
      {lines.map((ln, i) => (
        <text
          key={i}
          x={x}
          y={y - ((lines.length - 1) * 14) / 2 + i * 14}
          textAnchor="middle"
          fontSize="12"
          fill="white"
          stroke="black"
          strokeWidth={3}
          paintOrder="stroke"
          style={{ dominantBaseline: "middle", fontWeight: 600 }}
        >
          {ln}
        </text>
      ))}
    </>
  );
}

/* ---------------- door glyphs ---------------- */
function DoorGlyph({
  x,
  y,
  ux,
  uy,
  kind,
}: {
  x: number;
  y: number;
  ux: number;
  uy: number;
  kind: "simple" | "locked";
}) {
  const px = -uy,
    py = ux;

  if (kind === "simple") {
    const half = 6;
    const x1 = x - px * half,
      y1 = y - py * half;
    const x2 = x + px * half,
      y2 = y + py * half;
    return (
      <>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(0,0,0,0.9)"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    );
  }

  // locked: small padlock
  const bodyR = 5;
  const shackleR = 4;
  const shX = x,
    shY = y - bodyR - 2;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={bodyR + 1.5}
        fill="none"
        stroke="rgba(0,0,0,0.9)"
        strokeWidth={3}
      />
      <circle cx={x} cy={y} r={bodyR} fill="none" stroke="#fff" strokeWidth={2} />
      <path
        d={`M ${shX - shackleR},${shY} a ${shackleR},${shackleR} 0 0 1 ${2 * shackleR},0`}
        fill="none"
        stroke="rgba(0,0,0,0.9)"
        strokeWidth={3}
      />
      <path
        d={`M ${shX - shackleR},${shY} a ${shackleR},${shackleR} 0 0 1 ${2 * shackleR},0`}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
      />
    </g>
  );
}

/* ---------------- arrowhead ---------------- */
function ArrowHead({
  x,
  y,
  ux,
  uy,
}: {
  x: number;
  y: number;
  ux: number;
  uy: number;
}) {
  const size = 8;
  const px = -uy,
    py = ux;
  const tipX = x,
    tipY = y;
  const leftX = x - ux * size - px * (size * 0.5);
  const leftY = y - uy * size - py * (size * 0.5);
  const rightX = x - ux * size + px * (size * 0.5);
  const rightY = y - uy * size + py * (size * 0.5);
  return (
    <polygon
      points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
      fill="rgba(255,255,255,0.9)"
    />
  );
}

/* ---------------- label rects for path-avoid ---------------- */
const LABEL_LINE_STEP = 14;
const CHAR_W = 7;
const LABEL_PAD_X = 8;
const LABEL_PAD_Y = 4;

type Rect = { x: number; y: number; w: number; h: number };

function wrapLabel(s: string, maxChars = 14, maxLines = 3): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += " " + w;
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

function buildLabelRects(
  rooms: Room[],
  map: (cx: number, cy: number) => { x: number; y: number }
): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  for (const r of rooms) {
    const { x, y } = map(r.coords.cx, r.coords.cy);
    const lines = wrapLabel(r.label || r.vnum);
    const maxChars = Math.max(1, ...lines.map((ln) => ln.length));
    const textW = maxChars * CHAR_W;
    const textH = lines.length * LABEL_LINE_STEP;
    const firstY = y - ((lines.length - 1) * LABEL_LINE_STEP) / 2;
    const boxX = x - textW / 2 - LABEL_PAD_X;
    const boxY = firstY - 12 - LABEL_PAD_Y; // 12px font-size baseline
    const w = textW + LABEL_PAD_X * 2;
    const h = textH + LABEL_PAD_Y * 2;
    rects.set(r.vnum, { x: boxX, y: boxY, w, h });
  }
  return rects;
}

function lineRectIntersectionT(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: Rect
): [number, number] | null {
  let t0 = 0,
    t1 = 1;
  const dx = x2 - x1,
    dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    const pi = p[i],
      qi = q[i];
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const t = qi / pi;
      if (pi < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [t0, t1];
}

function lineMinusRects(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rects: Rect[],
  gapPx = 8
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
  if (cuts.length === 0) return [[x1, y1, x2, y2]];
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
  if (prev < 1) out.push([x1 + (x2 - x1) * prev, y1 + (y2 - y1) * prev, x2, y2]);
  return out;
}

/* ---------------- main ---------------- */
export default function OctRenderer({
  rooms,
  level,
  primaryVnum,
  centerCx,
  centerCy,
  fit = "container",
}: Props) {
  const ref = React.useRef<SVGSVGElement | null>(null);
  const [size, setSize] = React.useState({ w: 800, h: 600 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setSize({ w: cr.width, h: cr.height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // choose mapping
  const contentMapper = React.useMemo(
    () => (fit === "content" ? makeContentMapper(rooms, 120) : null),
    [rooms, fit]
  );

  const map = React.useCallback(
    (cx: number, cy: number) => {
      if (contentMapper) return contentMapper.map(cx, cy);
      // centered mode
      const center = (() => {
        if (typeof centerCx === "number" && typeof centerCy === "number")
          return { cx: centerCx, cy: centerCy };
        // prefer primary
        if (primaryVnum) {
          const pr = rooms.find((r) => r.vnum === primaryVnum);
          if (pr) return { cx: pr.coords.cx, cy: pr.coords.cy };
        }
        return { cx: 0, cy: 0 };
      })();
      return gridToPx_centered(cx, cy, center, size.w, size.h);
    },
    [contentMapper, centerCx, centerCy, primaryVnum, rooms, size]
  );

  // edges list (skip U/D)
  type Edge = {
    from: Room;
    to: Room;
    dir: Direction;
    oneWay: boolean;
    door: ExitDef["door"];
  };
  const edges: Edge[] = React.useMemo(() => {
    const out: Edge[] = [];
    const byVnum = new Map<string, Room>();
    for (const r of rooms) byVnum.set(r.vnum, r);
    for (const r of rooms) {
      for (const [dir, ex] of Object.entries(r.exits) as [Direction, ExitDef][]) {
        if (!ex?.to) continue;
        if (dir === "U" || dir === "D") continue;
        const tgt = byVnum.get(ex.to);
        if (!tgt) continue;
        if ((tgt.coords.vz ?? 0) !== level || (r.coords.vz ?? 0) !== level) continue;
        out.push({ from: r, to: tgt, dir, oneWay: !!ex.oneWay, door: ex.door ?? null });
      }
    }
    return out;
  }, [rooms, level]);

  const labelRects = React.useMemo(() => buildLabelRects(rooms, map), [rooms, map]);

  // determine SVG size
  const svgWidth = contentMapper ? contentMapper.width : "100%";
  const svgHeight = contentMapper ? contentMapper.height : "100%";

  return (
    <svg
      ref={ref}
      width={svgWidth}
      height={svgHeight}
      style={{ display: "block", background: "#0f0f10" }}
    >
      {/* edges */}
      {edges.map((e, i) => {
        const a = map(e.from.coords.cx, e.from.coords.cy);
        const b = map(e.to.coords.cx, e.to.coords.cy);
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const { ux, uy } = dirUnit(dx, dy);

        // push line off octagon; leave extra clearance before the arrowhead
        const r = TILE / 2;
        const k = 0.4142 * r;
        const margin = 4;
        const insetStart = k + margin;
        const insetEnd = k + margin + HEAD_CLEAR;

        const ax = a.x + ux * insetStart,
          ay = a.y + uy * insetStart;
        const bx = b.x - ux * insetEnd,
          by = b.y - uy * insetEnd;

        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;

        const avoid: Rect[] = [];
        for (const rr of rooms) {
          const rect = labelRects.get(rr.vnum);
          if (rect) avoid.push(rect);
        }

        const segments = lineMinusRects(ax, ay, bx, by, avoid, 6);
        const rev = reverseDir(e.dir);
        const targetHasReverse =
          !!e.to.exits?.[rev] && e.to.exits[rev]?.to === e.from.vnum;

        const last = segments[segments.length - 1] || [ax, ay, bx, by];

        return (
          <g key={i} pointerEvents="none">
            {/* forward segments */}
            {segments.map(([x1, y1, x2, y2], si) => (
              <line
                key={si}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}

            {/* doors */}
            {e.door && (e.door as any).type === "simple" && (
              <DoorGlyph x={mx} y={my} ux={ux} uy={uy} kind="simple" />
            )}
            {e.door && (e.door as any).type === "locked" && (
              <DoorGlyph x={mx} y={my} ux={ux} uy={uy} kind="locked" />
            )}

            {/* arrowhead on last visible segment */}
            {(() => {
              const [lx1, ly1, lx2, ly2] = last;
              const ldx = lx2 - lx1,
                ldy = ly2 - ly1;
              const { ux: lux, uy: luy } = dirUnit(ldx, ldy);
              return <ArrowHead x={lx2} y={ly2} ux={lux} uy={luy} />;
            })()}

            {/* implied dotted reverse with the same clearance on its “target” */}
            {!e.oneWay &&
              !targetHasReverse &&
              lineMinusRects(
                // start at the (now in-cleared) target side and leave clearance at the new “target”
                b.x - ux * insetStart,
                by + uy * (insetEnd - insetStart),
                a.x + ux * insetEnd,
                a.y + uy * insetEnd,
                avoid,
                6
              ).map(([x1, y1, x2, y2], si) => (
                <line
                  key={`rev-${si}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              ))}
          </g>
        );
      })}

      {/* tiles */}
      {rooms.map((r) => {
        const { x, y } = map(r.coords.cx, r.coords.cy);
        const sector: TerrainKind = r.sector ?? TerrainKind.Unknown;
        const sectorFill = TERRAIN_FILL[sector];
        const isPrimary = !!primaryVnum && r.vnum === primaryVnum;
        return (
          <g key={r.vnum}>
            <Oct
              x={x}
              y={y}
              size={TILE}
              label={r.label || r.vnum}
              isPrimary={isPrimary}
              sectorFill={sectorFill}
            />
          </g>
        );
      })}
    </svg>
  );
}
