// src/components/ExitEditor.tsx
import React from 'react'
import { Direction, ExitDef, DIRECTIONS } from '../types'
import { useMap } from '@state/mapStore'
import { dirToGrid } from '../render/dir'

export default function ExitEditor({ vnum }: { vnum: string }) {
  const { state, dispatch } = useMap()
  const room = state.doc.rooms[vnum]
  if (!room) return null

  const upsertAndPlace = (dir: Direction, field: keyof ExitDef, value: any) => {
    const next: ExitDef = {
      to: null,
      oneWay: false,
      door: null,
      status: 'unknown',
      ...(room.exits[dir] || {}),
    }
    ;(next as any)[field] = value
    dispatch({ type: 'UPSERT_EXIT', vnum, dir, exit: next })

    if (field === 'to' && typeof value === 'string' && value.trim()) {
      const targetVnum = value.trim()
      const targetExists = !!state.doc.rooms[targetVnum]
      if (!targetExists) {
        dispatch({ type: 'ADD_ROOM', vnum: targetVnum })
      }

      const srcCoords = room.coords
      const target = state.doc.rooms[targetVnum]
      const targetCoords = target?.coords

      if (
        srcCoords &&
        (!targetCoords ||
          targetCoords.cx === undefined ||
          targetCoords.cy === undefined ||
          targetCoords.vz === undefined)
      ) {
        const [dx, dy, dz] = dirToGrid(dir)
        const cx = srcCoords.cx + dx
        const cy = srcCoords.cy + dy
        const vz = srcCoords.vz + dz
        dispatch({
          type: 'PATCH_ROOM',
          vnum: targetVnum,
          patch: { coords: { cx, cy, vz } },
        })
      }

      const srcCat = room.category
      const tgtCat = state.doc.rooms[targetVnum]?.category
      const tgtHasAnyCat =
        !!(tgtCat && (tgtCat.worldId || tgtCat.continentId || tgtCat.areaId))
      if (srcCat && !tgtHasAnyCat) {
        dispatch({
          type: 'PATCH_ROOM',
          vnum: targetVnum,
          patch: { category: srcCat } as any,
        })
      }
    }
  }

  const deleteExit = (dir: Direction) => {
    dispatch({ type: 'DELETE_EXIT', vnum, dir })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6 }}>
      {DIRECTIONS.map((dir) => {
        const ex = room.exits[dir]
        return (
          <div key={dir} style={{ display: 'contents' }}>
            <div style={{ fontWeight: 700, alignSelf: 'center' }}>{dir}</div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                placeholder="to vnum (nullable)"
                value={ex?.to ?? ''}
                onChange={(e) => upsertAndPlace(dir, 'to', e.target.value || null)}
                style={{ minWidth: 140 }}
              />

              <select
                value={ex?.status ?? 'unknown'}
                onChange={(e) =>
                  upsertAndPlace(dir, 'status', e.target.value as ExitDef['status'])
                }
              >
                <option value="unknown">unknown</option>
                <option value="created">created</option>
                <option value="confirmed">confirmed</option>
                <option value="anomalous">anomalous</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={!!ex?.oneWay}
                  onChange={(e) => upsertAndPlace(dir, 'oneWay', e.target.checked)}
                />
                one-way
              </label>

              <select
                value={ex?.door ? (ex.door as any).type : 'none'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'none') upsertAndPlace(dir, 'door', null)
                  else if (v === 'simple') upsertAndPlace(dir, 'door', { type: 'simple' })
                  else upsertAndPlace(dir, 'door', { type: 'locked', keyId: '' })
                }}
              >
                <option value="none">no door</option>
                <option value="simple">🚪 simple</option>
                <option value="locked">🔒 locked</option>
              </select>

              {ex?.door && (ex.door as any).type === 'locked' && (
                <input
                  placeholder="key id"
                  value={(ex.door as any).keyId ?? ''}
                  onChange={(e) =>
                    upsertAndPlace(dir, 'door', { type: 'locked', keyId: e.target.value })
                  }
                  style={{ minWidth: 120 }}
                />
              )}
            </div>

            <div>
              {ex ? (
                <button onClick={() => deleteExit(dir)}>x</button>
              ) : (
                <button onClick={() => upsertAndPlace(dir, 'status', 'unknown')}>+</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
