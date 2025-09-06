import { useMap } from '@state/mapStore'

export default function Toolbar() {
  const { state, dispatch } = useMap()
  const current = state.view.currentLevel

  const setLevel = (level: number) =>
    dispatch({ type: 'SET_LEVEL', level })

  return (
    <div className="toolbar">
      <button
        onClick={() => {
          const v = prompt('New room vnum?')?.trim()
          if (v) dispatch({ type: 'ADD_ROOM', vnum: v })
        }}
      >
        Add Room
      </button>
      <button
        onClick={() => {
          if (!state.selectedVnum) return
          if (confirm(`Delete room ${state.selectedVnum}?`)) {
            dispatch({ type: 'DELETE_ROOM', vnum: state.selectedVnum })
          }
        }}
        disabled={!state.selectedVnum}
      >
        Delete Selected
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        <label>View Level:</label>
        <input
          type="number"
          value={typeof current === 'number' ? current : 0}
          onChange={(e) => setLevel(Number(e.target.value))}
          style={{ width: 60 }}
        />
        <button onClick={() => setLevel((typeof current === 'number' ? current : 0) + 1)}>▲</button>
        <button onClick={() => setLevel((typeof current === 'number' ? current : 0) - 1)}>▼</button>
      </div>
    </div>
  )
}
