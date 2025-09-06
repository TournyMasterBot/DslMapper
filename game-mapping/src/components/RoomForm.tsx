// src/components/RoomForm.tsx
import { useMap } from '@state/mapStore'
import ExitEditor from './ExitEditor'

export default function RoomForm({ vnum }: { vnum: string }) {
  const { state, dispatch } = useMap()
  const room = state.doc.rooms[vnum]
  if (!room) return <div style={{ padding: 16 }}>No room selected.</div>

  const set = (key: keyof typeof room, value: any) =>
    dispatch({ type: 'PATCH_ROOM', vnum, patch: { [key]: value } as any })

  const setCoords = (k: 'q'|'r'|'level', value: number) => {
    const c = room.coords ?? { q: 0, r: 0, level: 0 }
    set('coords', { ...c, [k]: value })
  }

  const setMovement = (k: 'requires'|'bans', value: string) => {
    const mv = room.movement ?? { requires: [], bans: [] as string[] }
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    set('movement', { ...mv, [k]: arr })
  }

  const setFlags = (json: string) => {
    try { set('flags', json ? JSON.parse(json) : undefined) } catch {}
  }

  return (
    <section style={{ padding: 12, display: 'grid', gap: 12 }}>
      <h3>Room: {room.vnum}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 1fr', gap: 8, alignItems: 'center' }}>
        <label>Label</label>
        <input value={room.label ?? ''} onChange={e => set('label', e.target.value)} />
        <label>Sector</label>
        <input value={room.sector ?? ''} onChange={e => set('sector', e.target.value)} />

        <label>q</label>
        <input type="number" value={room.coords?.q ?? 0} onChange={e => setCoords('q', Number(e.target.value))} />
        <label>r</label>
        <input type="number" value={room.coords?.r ?? 0} onChange={e => setCoords('r', Number(e.target.value))} />
        <label>level</label>
        <input type="number" value={room.coords?.level ?? 0} onChange={e => setCoords('level', Number(e.target.value))} />

        <label>Requires (comma)</label>
        <input placeholder="swim, fly" value={(room.movement?.requires ?? []).join(', ')} onChange={e => setMovement('requires', e.target.value)} />
        <label>Bans (comma)</label>
        <input placeholder="flight" value={(room.movement?.bans ?? []).join(', ')} onChange={e => setMovement('bans', e.target.value)} />

        <label>Flags (JSON)</label>
        <textarea rows={3} placeholder='{"rubbleCleared":false}' value={room.flags ? JSON.stringify(room.flags) : ''} onChange={e => setFlags(e.target.value)} />
      </div>

      <div>
        <h4>Exits</h4>
        <ExitEditor vnum={room.vnum} />
      </div>

      <div>
        <h4>Interactions (placeholder)</h4>
        <p style={{ opacity: .8 }}>We’ll add a structured editor later.</p>
      </div>
    </section>
  )
}
