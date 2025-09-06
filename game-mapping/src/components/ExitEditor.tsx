// src/components/ExitEditor.tsx
import { Direction, DIRECTIONS, ExitDef } from '../types'
import { useMap } from '@state/mapStore'

export default function ExitEditor({ vnum }: { vnum: string }) {
  const { state, dispatch } = useMap()
  const room = state.doc.rooms[vnum]
  if (!room) return null

  const onUpsert = (dir: Direction, field: keyof ExitDef, value: any) => {
    const next: ExitDef = {
      to: null,
      oneWay: false,
      door: null,
      status: 'unknown',
      ...(room.exits[dir] || {})
    }
    ;(next as any)[field] = value
    dispatch({ type: 'UPSERT_EXIT', vnum, dir, exit: next })
  }

  const onDelete = (dir: Direction) => dispatch({ type: 'DELETE_EXIT', vnum, dir })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6 }}>
      {DIRECTIONS.map((dir) => {
        const ex = room.exits[dir]
        return (
          <div key={dir} style={{ display: 'contents' }}>
            <div style={{ fontWeight: 700 }}>{dir}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                placeholder="to vnum (nullable)"
                value={ex?.to ?? ''}
                onChange={(e) => onUpsert(dir, 'to', e.target.value || null)}
              />
              <select
                value={ex?.status ?? 'unknown'}
                onChange={(e) => onUpsert(dir, 'status', e.target.value as ExitDef['status'])}
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
                  onChange={(e) => onUpsert(dir, 'oneWay', e.target.checked)}
                />
                one-way
              </label>
              <select
                value={ex?.door ? (ex.door as any).type : 'none'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'none') onUpsert(dir, 'door', null)
                  else if (v === 'simple') onUpsert(dir, 'door', { type: 'simple' })
                  else onUpsert(dir, 'door', { type: 'locked', keyId: '' })
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
                  onChange={(e) => onUpsert(dir, 'door', { type: 'locked', keyId: e.target.value })}
                />
              )}
            </div>
            <div>
              {ex ? (
                <button onClick={() => onDelete(dir)}>x</button>
              ) : (
                <button onClick={() => onUpsert(dir, 'status', 'unknown')}>+</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
