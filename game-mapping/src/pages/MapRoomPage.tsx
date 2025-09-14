import { useSearchParams, useParams } from 'react-router-dom'
import { useMap } from '@state/mapStore'
import HexRenderer from '../render/HexRenderer'

export default function MapRoomPage() {
  const { state } = useMap()
  const { vnum = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const level = Number(sp.get('level') ?? 0)
  const setLevel = (n: number) => { sp.set('level', String(n)); setSp(sp, { replace: true }) }

  return (
    <div className="layout">
      <div className="main" style={{ gridColumn: '1 / -1' }}>
        <div className="toolbar">
          <strong>Room:</strong>&nbsp;{vnum}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <label>Level:</label>
            <input type="number" value={level} onChange={e => setLevel(Number(e.target.value))} style={{ width: 64 }} />
            <button onClick={() => setLevel(level + 1)}>▲</button>
            <button onClick={() => setLevel(level - 1)}>▼</button>
          </div>
        </div>
        <div className="content">
          <HexRenderer doc={state.doc} level={level} focusVnum={vnum} />
        </div>
      </div>
    </div>
  )
}
