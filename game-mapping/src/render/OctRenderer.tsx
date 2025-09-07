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
};

const TILE = 40;
const GAP = 4;

/* ---------------- grid positioning ---------------- */
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
        fill={`${sectorFill}E6`} /* ~90% opacity */
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
        d={`M ${shX - shackleR},${shY} a ${shackleR},${shackleR} 0 0 1 ${
          2 * shackleR
        },0`}
        fill="none"
        stroke="rgba(0,0,0,0.9)"
        strokeWidth={3}
      />
      <path
        d={`M ${shX - shackleR},${shY} a ${shackleR},${shackleR} 0 0 1 ${
          2 * shackleR
        },0`}
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
const LABEL_FONT_SIZE = 12;
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
  center: { cx: number; cy: number },
  size: { w: number; h: number }
): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  for (const r of rooms) {
    const { x, y } = gridToPx(r.coords.cx, r.coords.cy, center, size.w, size.h);
    const lines = wrapLabel(r.label || r.vnum);
    const maxChars = Math.max(1, ...lines.map((ln) => ln.length));
    const textW = maxChars * CHAR_W;
    const textH = lines.length * LABEL_LINE_STEP;
    const firstY = y - ((lines.length - 1) * LABEL_LINE_STEP) / 2;
    const boxX = x - textW / 2 - LABEL_PAD_X;
    const boxY = firstY - LABEL_FONT_SIZE - LABEL_PAD_Y;
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
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        c[1]
      );
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

/* ---------------- main ---------------- */
export default function OctRenderer({
  rooms,
  level,
  primaryVnum,
  centerCx,
  centerCy,
}: Props) {
  const ref = React.useRef<SVGSVGElement | null>(null);
  const [size, setSize] = React.useState({ w: 800, h: 600 });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setSize({ w: cr.width, h: cr.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const byVnum = React.useMemo(() => {
    const m = new Map<string, Room>();
    for (const r of rooms) m.set(r.vnum, r);
    return m;
  }, [rooms]);

  const center = React.useMemo(() => {
    if (typeof centerCx === "number" && typeof centerCy === "number")
      return { cx: centerCx, cy: centerCy };
    if (primaryVnum) {
      const pr = byVnum.get(primaryVnum);
      if (pr) return { cx: pr.coords.cx, cy: pr.coords.cy };
    }
    return { cx: 0, cy: 0 };
  }, [byVnum, primaryVnum, centerCx, centerCy]);

  type Edge = {
    from: Room;
    to: Room;
    dir: Direction;
    oneWay: boolean;
    door: ExitDef["door"];
  };

  const edges: Edge[] = React.useMemo(() => {
    const out: Edge[] = [];
    for (const r of rooms) {
      for (const [dir, ex] of Object.entries(r.exits) as [
        Direction,
        ExitDef
      ][]) {
        if (!ex?.to) continue;
        if (dir === "U" || dir === "D") continue; // U/D are stored but not rendered as arrows
        const tgt = byVnum.get(ex.to);
        if (!tgt) continue;
        if (tgt.coords.vz !== level || r.coords.vz !== level) continue;
        out.push({
          from: r,
          to: tgt,
          dir,
          oneWay: !!ex.oneWay,
          door: ex.door ?? null,
        });
      }
    }
    return out;
  }, [rooms, byVnum, level]);

  const labelRects = React.useMemo(
    () => buildLabelRects(rooms, center, size),
    [rooms, center, size]
  );

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      style={{ display: "block", background: "#0f0f10" }}
    >
      {/* edges (under tiles; glyphs/heads on top of each segment) */}
      {edges.map((e, i) => {
        const a = gridToPx(
          e.from.coords.cx,
          e.from.coords.cy,
          center,
          size.w,
          size.h
        );
        const b = gridToPx(
          e.to.coords.cx,
          e.to.coords.cy,
          center,
          size.w,
          size.h
        );

        const dx = b.x - a.x,
          dy = b.y - a.y;
        const { ux, uy } = dirUnit(dx, dy);

        // Push line off octagon corners a bit
        const r = TILE / 2;
        const k = 0.4142 * r;
        const margin = 4;
        const inset = k + margin;
        const ax = a.x + ux * inset,
          ay = a.y + uy * inset;
        const bx = b.x - ux * inset,
          by = b.y - uy * inset;

        // middle for door glyphs
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;

        // avoid label boxes
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

            {/* door glyph at the mid point of full (uninset) arrow run */}
            {e.door && (e.door as any).type === "simple" && (
              <DoorGlyph x={mx} y={my} ux={ux} uy={uy} kind="simple" />
            )}
            {e.door && (e.door as any).type === "locked" && (
              <DoorGlyph x={mx} y={my} ux={ux} uy={uy} kind="locked" />
            )}

            {/* arrowhead on the very last visible forward segment */}
            {(() => {
              const [lx1, ly1, lx2, ly2] = last;
              const ldx = lx2 - lx1,
                ldy = ly2 - ly1;
              const { ux: lux, uy: luy } = dirUnit(ldx, ldy);
              return <ArrowHead x={lx2} y={ly2} ux={lux} uy={luy} />;
            })()}

            {/* implied dotted reverse if not one-way and reverse missing */}
            {!e.oneWay &&
              !targetHasReverse &&
              lineMinusRects(bx, by, ax, ay, avoid, 6).map(
                ([x1, y1, x2, y2], si) => (
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
                )
              )}
          </g>
        );
      })}

      {/* tiles on top */}
      {rooms.map((r) => {
        const { x, y } = gridToPx(
          r.coords.cx,
          r.coords.cy,
          center,
          size.w,
          size.h
        );
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
