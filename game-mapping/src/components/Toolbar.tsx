import React from 'react'
import { useMap } from '@state/mapStore'

const LVL_KEY = 'dslmapper:viewLevel'

export default function Toolbar() {
  const { state, dispatch } = useMap()
  const current = typeof state.level === 'number' ? state.level : 0
  const selectedVnum = state.selected || null

  // Seed editor level from localStorage (if renderer was opened first).
  React.useEffect(() => {
    const raw = localStorage.getItem(LVL_KEY)
    if (raw != null && raw !== '' && !Number.isNaN(Number(raw))) {
      const n = Number(raw)
      if (n !== current) {
        dispatch({ type: 'SET_LEVEL', level: n })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLevel = (level: number) => {
    dispatch({ type: 'SET_LEVEL', level })
    try {
      localStorage.setItem(LVL_KEY, String(level))
    } catch {
      /* ignore quota */
    }
  }

  const openRenderer = () => {
    const sel = selectedVnum ? state.doc.rooms[selectedVnum] : null

    const base = window.location.href.split('#')[0] // absolute origin w/o hash
    const params = new URLSearchParams()

    // prefer selected room’s level/coords if present
    const level = sel ? sel.coords.vz : current
    params.set('level', String(level))

    // Also persist to the cross-tab channel so the new tab opens at this level
    try { localStorage.setItem(LVL_KEY, String(level)) } catch {}

    let worldId = sel?.category?.worldId ?? 'all'
    let continentId = sel?.category?.continentId ?? 'all'
    let areaId = sel?.category?.areaId ?? 'all'

    if (sel) {
      params.set('vnum', sel.vnum)
      params.set('cx', String(sel.coords.cx))
      params.set('cy', String(sel.coords.cy))
    }

    const absolute = `${base}#/renderer/${encodeURIComponent(worldId)}/${encodeURIComponent(continentId)}/${encodeURIComponent(areaId)}?${params.toString()}`
    window.open(absolute, '_blank', 'noopener')
  }

  return (
    <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => {
          const v = prompt('New room vnum?')?.trim()
          if (v) {
            dispatch({ type: 'ADD_ROOM', vnum: v })
            requestAnimationFrame(() => dispatch({ type: 'SELECT_ROOM', vnum: v }))
          }
        }}
      >
        Add Room
      </button>

      <button
        type="button"
        onClick={() => {
          if (!selectedVnum) return
          if (confirm(`Delete room ${selectedVnum}?`)) {
            dispatch({ type: 'DELETE_ROOM', vnum: selectedVnum })
          }
        }}
        disabled={!selectedVnum}
      >
        Delete Selected
      </button>

      <button type="button" onClick={openRenderer}>Open Renderer ↗</button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <label>View Level:</label>
        <input
          type="number"
          value={current}
          onChange={(e) => setLevel(Number(e.target.value))}
          style={{ width: 72 }}
        />
        <button type="button" onClick={() => setLevel(current + 1)}>▲</button>
        <button type="button" onClick={() => setLevel(current - 1)}>▼</button>
      </div>
    </div>
  )
}
