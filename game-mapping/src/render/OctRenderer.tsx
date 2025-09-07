// src/render/OctRenderer.tsx
import React from 'react'
import { Room } from '../types'

type Props = {
  rooms: Room[]
  level: number
  focusVnum?: string | null
  centerCx?: number
  centerCy?: number
}

const TILE = 40  // base tile unit (edge-to-edge length along flat top)
const GAP  = 4   // spacing between octagons

// Simple flat-top octagon layout: treat cx,cy as grid and map to pixels.
// You can refine later with true oct packing; this is stable & predictable.
function gridToPx(cx: number, cy: number, center: {cx:number;cy:number}, w: number, h: number) {
  const dx = cx - center.cx
  const dy = cy - center.cy
  const pitchX = TILE + GAP
  const pitchY = TILE + GAP
  const x = Math.round(w/2 + dx * pitchX)
  const y = Math.round(h/2 + dy * pitchY)
  return { x, y }
}

function Oct({ x, y, size, active=false, label }: { x:number; y:number; size:number; active?:boolean; label:string }) {
  // draw as an 8-sided polygon centered at (x,y)
  const r = size/2
  const k = 0.4142 * r // corner inset factor for an octagon
  const pts = [
    [x - k, y - r],
    [x + k, y - r],
    [x + r, y - k],
    [x + r, y + k],
    [x + k, y + r],
    [x - k, y + r],
    [x - r, y + k],
    [x - r, y - k],
  ].map(p => p.join(',')).join(' ')
  return (
    <>
      <polygon
        points={pts}
        fill={active ? 'rgba(120,200,255,0.25)' : 'rgba(255,255,255,0.06)'}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={1}
      />
      <text x={x} y={y+4} textAnchor="middle" fontSize="12" fill="#ddd">{label}</text>
    </>
  )
}

export default function OctRenderer({ rooms, level, focusVnum, centerCx, centerCy }: Props) {
  const ref = React.useRef<SVGSVGElement | null>(null)
  const [size, setSize] = React.useState({ w: 800, h: 600 })

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect
      setSize({ w: cr.width, h: cr.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // choose center: explicit centerCx/cy, else focus room, else (0,0)
  const center = React.useMemo(() => {
    if (typeof centerCx === 'number' && typeof centerCy === 'number') return { cx: centerCx, cy: centerCy }
    const focus = focusVnum ? rooms.find(r => r.vnum === focusVnum) : null
    return focus ? { cx: focus.coords.cx, cy: focus.coords.cy } : { cx: 0, cy: 0 }
  }, [rooms, focusVnum, centerCx, centerCy])

  return (
    <svg ref={ref} width="100%" height="100%" style={{ display:'block', background:'#0f0f10' }}>
      {rooms.map(r => {
        const { x, y } = gridToPx(r.coords.cx, r.coords.cy, center, size.w, size.h)
        return (
          <g key={r.vnum}>
            <Oct
              x={x}
              y={y}
              size={TILE}
              active={r.vnum === focusVnum}
              label={r.label || r.vnum}
            />
          </g>
        )
      })}
    </svg>
  )
}
