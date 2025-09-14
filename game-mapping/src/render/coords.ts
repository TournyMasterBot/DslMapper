import { Coords } from '../types'

// For flat-top, use axial (q = cx, r = cy)
export function cubeToAxial(cx = 0, cy = 0, cz = 0) {
  return { q: cx, r: cy }
}
export function axialToCube(q = 0, r = 0) {
  const cx = q, cy = r, cz = -cx - cy
  return { cx, cy, cz }
}

export function deriveAxial(c: Coords | undefined) {
  if (!c) return { q: 0, r: 0 }
  const hasCube =
    Number.isFinite(c?.cx) && Number.isFinite(c?.cy) && Number.isFinite(c?.cz)
  let base = { q: 0, r: 0 }
  if (hasCube) base = cubeToAxial(c!.cx!, c!.cy!, c!.cz!)
  else if (Number.isFinite(c?.q) || Number.isFinite(c?.r)) base = { q: c!.q ?? 0, r: c!.r ?? 0 }

  const oq = hasCube && Number.isFinite(c?.q) ? (c!.q as number) : 0
  const or = hasCube && Number.isFinite(c?.r) ? (c!.r as number) : 0
  return { q: base.q + oq, r: base.r + or }
}

export function getVz(c: Coords | undefined): number {
  // legacy fallback
  // @ts-ignore
  const legacy = c && (Number.isFinite(c.z) ? c.z : (Number.isFinite(c.level) ? c.level : undefined))
  return Number.isFinite(c?.vz) ? (c!.vz as number) : (Number.isFinite(legacy) ? legacy as number : 0)
}
