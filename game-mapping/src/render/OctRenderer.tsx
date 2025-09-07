// src/render/OctRenderer.tsx
import React from "react";
import { Room, Direction, ExitDef, TerrainKind } from "../types";
import { dirUnit, reverseDir } from "./dir";
import { TERRAIN_FILL, TERRAIN_ORDER } from "./terrainPalette";

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

function TilePolygon({
  x,
  y,
  size,
  isPrimary,
  sectorFill,
}: {
  x: number;
  y: number;
  size: number;
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
  return (
    <polygon
      points={pts}
      fill={`${sectorFill}E6`}
      stroke={isPrimary ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}
      strokeWidth={isPrimary ? 2 : 1}
    />
  );
}

function TileLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill="#ddd">
      {label}
    </text>
  );
}

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
      fill="rgba(255,255,255,0.85)"
    />
  );
}

export default function OctRenderer({
  rooms,
  level,
  primaryVnum,
  centerCx,
  centerCy,
}: Props) {
  const ref = React.useRef<SVGSVGElement | null>(null);
  const [size, setSize] = React.useState({ w: 800, h: 600 });
  const [legendOpen, setLegendOpen] = React.useState(true);

  const LEGEND_ROW_H = 18;
  const LEGEND_HDR_H = 22;
  const LEGEND_PAD_V = 12;
  const LEGEND_PAD_H = 12;
  const LEGEND_COL_W = 132;
  const LEGEND_BTN_W = 34;
  const LEGEND_BTN_H = 28;

  const legendCols = React.useMemo(() => {
    const items = TERRAIN_ORDER.length;
    const tryCols = (cols: number) => {
      const rows = Math.ceil(items / cols);
      const height = LEGEND_PAD_V * 2 + LEGEND_HDR_H + rows * LEGEND_ROW_H;
      return { cols, rows, height };
    };
    const one = tryCols(1);
    if (one.height <= size.h - 36) return one.cols;
    const two = tryCols(2);
    if (two.height <= size.h - 36) return two.cols;
    return 3;
  }, [size.h]);

  const legendRows = Math.ceil(TERRAIN_ORDER.length / legendCols);
  const legendHeight =
    LEGEND_PAD_V * 2 + LEGEND_HDR_H + legendRows * LEGEND_ROW_H + 25;
  const legendWidth = LEGEND_PAD_H * 2 + legendCols * LEGEND_COL_W;

  const legendX = 12;
  const legendY = 12 + LEGEND_BTN_H + 6;

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

  type Edge = { from: Room; to: Room; dir: Direction; oneWay: boolean };
  const edges: Edge[] = React.useMemo(() => {
    const out: Edge[] = [];
    for (const r of rooms) {
      for (const [dir, ex] of Object.entries(r.exits) as [
        Direction,
        ExitDef
      ][]) {
        if (!ex?.to) continue;
        const tgt = byVnum.get(ex.to);
        if (!tgt) continue;
        if (tgt.coords.vz !== level || r.coords.vz !== level) continue;
        out.push({ from: r, to: tgt, dir, oneWay: !!ex.oneWay });
      }
    }
    return out;
  }, [rooms, byVnum, level]);

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      style={{ display: "block", background: "#0f0f10" }}
    >
      {/* LEGEND UNDERLAY */}
      <foreignObject
        x={legendX}
        y={12}
        width={LEGEND_BTN_W}
        height={LEGEND_BTN_H}
      >
        <div
          style={{
            width: LEGEND_BTN_W,
            height: LEGEND_BTN_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(20,20,24,0.95)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 6,
            boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setLegendOpen((o) => !o);
            }}
            title={legendOpen ? "Hide legend" : "Show legend"}
            style={{
              width: "100%",
              height: "100%",
              background: "transparent",
              color: "#ddd",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {legendOpen ? "–" : "☰"}
          </button>
        </div>
      </foreignObject>

      <foreignObject
        x={legendX}
        y={legendY}
        width={legendWidth}
        height={legendOpen ? legendHeight : 0}
      >
        <div
          style={{
            background: "rgba(20,20,24,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            boxShadow: "0 14px 28px rgba(0,0,0,0.45)",
            color: "#ddd",
            font: "12px/1.2 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            padding: legendOpen ? `${LEGEND_PAD_V}px ${LEGEND_PAD_H}px` : 0,
            overflow: "hidden",
            transformOrigin: "top left",
            transform: legendOpen ? "scaleY(1)" : "scaleY(0.9)",
            opacity: legendOpen ? 1 : 0,
            transition:
              "opacity 160ms ease, transform 160ms ease, padding 160ms ease",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${legendCols}, ${
                LEGEND_COL_W - 8
              }px)`,
              columnGap: 8,
              rowGap: 6,
            }}
          >
            <div
              style={{
                opacity: 0.9,
                fontWeight: 600,
                gridColumn: `1 / span ${legendCols}`,
              }}
            >
              Terrain
            </div>
            {Array.from({ length: legendCols }).map((_, colIdx) => {
              const sliceStart = colIdx * legendRows;
              const sliceEnd = sliceStart + legendRows;
              const items = TERRAIN_ORDER.slice(sliceStart, sliceEnd);
              return (
                <div key={colIdx} style={{ display: "grid", rowGap: 6 }}>
                  {items.map((t) => (
                    <div
                      key={t}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr",
                        columnGap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: `${TERRAIN_FILL[t]}E6`,
                          border: "1px solid rgba(255,255,255,0.22)",
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.25) inset",
                        }}
                      />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </foreignObject>

      {/* POLYGONS */}
      {rooms.map((r) => {
        const { x, y } = gridToPx(r.coords.cx, r.coords.cy, center, size.w, size.h);
        const sector: TerrainKind = r.sector ?? TerrainKind.Unknown;
        const sectorFill = TERRAIN_FILL[sector];
        const isPrimary = !!primaryVnum && r.vnum === primaryVnum;
        return (
          <TilePolygon
            key={`poly-${r.vnum}`}
            x={x}
            y={y}
            size={TILE}
            isPrimary={isPrimary}
            sectorFill={sectorFill}
          />
        );
      })}

      {/* EDGES ABOVE POLYGONS */}
      {edges.map((e, i) => {
        const a = gridToPx(e.from.coords.cx, e.from.coords.cy, center, size.w, size.h);
        const b = gridToPx(e.to.coords.cx, e.to.coords.cy, center, size.w, size.h);
        const dx = b.x - a.x, dy = b.y - a.y;
        const { ux, uy } = dirUnit(dx, dy);
        const inset = TILE * 0.35;
        const ax = a.x + ux * inset, ay = a.y + uy * inset;
        const bx = b.x - ux * inset, by = b.y - uy * inset;
        const rev = reverseDir(e.dir);
        const targetHasReverse = !!e.to.exits?.[rev] && e.to.exits[rev]?.to === e.from.vnum;

        return (
          <g key={`edge-${i}`}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
            <ArrowHead x={bx} y={by} ux={ux} uy={uy} />
            {!e.oneWay && !targetHasReverse && (
              <line
                x1={bx}
                y1={by}
                x2={ax}
                y2={ay}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}

      {/* LABELS LAST */}
      {rooms.map((r) => {
        const { x, y } = gridToPx(r.coords.cx, r.coords.cy, center, size.w, size.h);
        return <TileLabel key={`label-${r.vnum}`} x={x} y={y} label={r.label || r.vnum} />;
      })}
    </svg>
  );
}
