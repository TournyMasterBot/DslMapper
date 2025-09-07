// src/render/ascii.ts
import { MapDocV1 } from '../types'

/**
 * Export a minimal ASCII view of an area at a given z-level.
 * 
 * For now this only lists rooms; later we’ll rasterize axial coords
 * into a text grid and draw connectors like the reference maps.
 */
export function exportAreaAscii(
  doc: MapDocV1,
  areaId: string,
  z: number
): string {
  const rooms = Object.values(doc.rooms).filter(
    (r) =>
      (r.coords?.z ?? (r.coords as any)?.level ?? 0) === z &&
      r.category?.areaId === areaId
  )

  const lines = [
    `Area: ${areaId}  Z-Level: ${z}`,
    `Rooms: ${rooms.length}`,
    '----------------------------------------',
    '[ascii map rendering to come]',
  ]

  return lines.join('\n')
}
