// src/render/hexMath.ts
// Flat-top hex geometry (so "N" is vertical).
// Axial (q,r) with neighbors: N(0,-1) S(0,1) NE(1,-1) SE(1,0) SW(-1,1) NW(-1,0)

const SQRT3 = Math.sqrt(3)

/** Flat-top axial -> pixel center */
export function axialToPixel(q: number, r: number, size: number) {
  const x = size * (1.5 * q)
  const y = size * (SQRT3 * (r + q / 2))
  return { x, y }
}

/** Flat-top corners (start angle 0° puts a flat side on top) */
function hexCorner(x: number, y: number, size: number, i: number) {
  const angle = (Math.PI / 180) * (60 * i)
  return [x + size * Math.cos(angle), y + size * Math.sin(angle)] as const
}

/** SVG polygon points string for a hex centered at (x,y) */
export function hexPoints(x: number, y: number, size: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const [px, py] = hexCorner(x, y, size, i)
    pts.push(`${px},${py}`)
  }
  return pts.join(' ')
}
