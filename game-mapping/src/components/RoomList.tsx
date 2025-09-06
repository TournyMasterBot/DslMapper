import { useMap } from '@state/mapStore'


export default function RoomList() {
const { state, dispatch } = useMap()
const rooms = Object.values(state.doc.rooms)
rooms.sort((a,b) => a.vnum.localeCompare(b.vnum))


return (
<aside style={{ width: 280, borderRight: '1px solid #333', padding: 8, overflow: 'auto' }}>
<h3>Rooms ({rooms.length})</h3>
<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
{rooms.map(r => (
<li key={r.vnum}>
<button style={{ width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 4, background: state.selectedVnum===r.vnum? '#222':'#111', color: '#eee', border: '1px solid #333', borderRadius: 4 }}
onClick={() => dispatch({ type: 'SELECT_ROOM', vnum: r.vnum })}>
<div style={{ fontWeight: 700 }}>{r.label ?? r.vnum}</div>
<div style={{ fontSize: 12, opacity: 0.8 }}>{r.vnum}{r.sector ? ` • ${r.sector}`: ''}</div>
</button>
</li>
))}
</ul>
</aside>
)
}