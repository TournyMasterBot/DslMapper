import RoomForm from './RoomForm'
import RoomList from './RoomList'
import Toolbar from './Toolbar'
import { useMap } from '@state/mapStore'


export default function MapEditor() {
const { state } = useMap()
return (
<div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh' }}>
<RoomList />
<div style={{ display: 'flex', flexDirection: 'column' }}>
<Toolbar />
<div style={{ flex: 1, overflow: 'auto' }}>
{state.selectedVnum ? (
<RoomForm vnum={state.selectedVnum} />
) : (
<div style={{ padding: 16, opacity: .8 }}>Select or add a room to begin.</div>
)}
</div>
</div>
</div>
)
}