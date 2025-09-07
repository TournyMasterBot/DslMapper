import React from 'react'
import { Direction, ExitDef, DIRECTIONS } from '../types'
import { useMap } from '@state/mapStore'
import { dirToGrid, reverseDir } from '../render/dir'

export default function ExitEditor({ vnum }: { vnum: string }) {
  const { state, dispatch } = useMap()
  const room = state.doc.rooms[vnum]
  if (!room) return null

  const upsertAndPlace = (dir: Direction, field: keyof ExitDef, value: any) => {
    const current = room.exits[dir]
    const next: ExitDef = {
      to: null,
      oneWay: false,
      door: null,
      status: 'unknown',
      ...(current || {}),
    }
    ;(next as any)[field] = value
    dispatch({ type: 'UPSERT_EXIT', vnum, dir, exit: next })

    // When we set a target, create target if missing and auto-place it near source.
    if (field === 'to' && typeof value === 'string' && value.trim()) {
      const targetVnum = value.trim()
      const target = state.doc.rooms[targetVnum]
      if (!target) {
        dispatch({ type: 'ADD_ROOM', vnum: targetVnum })
      }
      // auto-place if target lacks coords
      const t = state.doc.rooms[targetVnum]
      const hasCoords = !!t?.coords
      if (room.coords && !hasCoords) {
        const [dx, dy, dz] = dirToGrid(dir)
        const q = { cx: room.coords.cx + dx, cy: room.coords.cy + dy, vz: room.coords.vz + dz }
        dispatch({ type: 'PATCH_ROOM', vnum: targetVnum, patch: { coords: q } })
      }
      // inherit category if target lacks it
      if (room.category && !t?.category) {
        dispatch({ type: 'PATCH_ROOM', vnum: targetVnum, patch: { category: room.category } as any })
      }
    }

    // If toggling oneWay on, remove reverse exit on the target (if it exists)
    if (field === 'oneWay' && value === true) {
      const targetVnum = current?.to ?? null
      if (targetVnum) {
        const rev = reverseDir(dir)
        const targetRoom = state.doc.rooms[targetVnum]
        if (targetRoom?.exits?.[rev]) {
          dispatch({ type: 'DELETE_EXIT', vnum: targetVnum, dir: rev })
        }
      }
    }
  }

  const deleteExit = (dir: Direction) => {
    dispatch({ type: 'DELETE_EXIT', vnum, dir })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6 }}>
      {DIRECTIONS.filter(d => d !== 'U' && d !== 'D').map((dir) => {
        const ex = room.exits[dir]
        return (
          <div key={dir} style={{ display: 'contents' }}>
            <div style={{ fontWeight: 700, alignSelf: 'center' }}>{dir}</div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* link target vnum */}
              <input
                placeholder="to vnum (nullable)"
                value={ex?.to ?? ''}
                onChange={(e) => upsertAndPlace(dir as Direction, 'to', e.target.value || null)}
                style={{ minWidth: 140 }}
              />

              {/* status */}
              <select
                value={ex?.status ?? 'unknown'}
                onChange={(e) => upsertAndPlace(dir as Direction, 'status', e.target.value as ExitDef['status'])}
              >
                <option value="unknown">unknown</option>
                <option value="created">created</option>
                <option value="confirmed">confirmed</option>
                <option value="anomalous">anomalous</option>
              </select>

              {/* one-way */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={!!ex?.oneWay}
                  onChange={(e) => upsertAndPlace(dir as Direction, 'oneWay', e.target.checked)}
                />
                one-way
              </label>

              {/* door */}
              <select
                value={ex?.door ? (ex.door as any).type : 'none'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'none') upsertAndPlace(dir as Direction, 'door', null)
                  else if (v === 'simple') upsertAndPlace(dir as Direction, 'door', { type: 'simple' })
                  else upsertAndPlace(dir as Direction, 'door', { type: 'locked', keyId: '' })
                }}
              >
                <option value="none">no door</option>
                <option value="simple">🚪 simple</option>
                <option value="locked">🔒 locked</option>
              </select>

              {/* key id when locked */}
              {ex?.door && (ex.door as any).type === 'locked' && (
                <input
                  placeholder="key id"
                  value={(ex.door as any).keyId ?? ''}
                  onChange={(e) =>
                    upsertAndPlace(dir as Direction, 'door', { type: 'locked', keyId: e.target.value })
                  }
                  style={{ minWidth: 120 }}
                />
              )}
            </div>

            {/* add/remove exit */}
            <div>
              {ex ? (
                <button onClick={() => deleteExit(dir as Direction)}>x</button>
              ) : (
                <button onClick={() => upsertAndPlace(dir as Direction, 'status', 'unknown')}>+</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
