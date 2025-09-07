import React from 'react'
import { useMap } from '@state/mapStore'

export default function OpenRendererButton() {
  const { state } = useMap()

  const openRenderer = () => {
    const sel = state.selected ? state.doc.rooms[state.selected] : null
    const cat = sel?.category
    const worldId = encodeURIComponent(cat?.worldId ?? 'all')
    const contId  = encodeURIComponent(cat?.continentId ?? 'all')
    const areaId  = encodeURIComponent(cat?.areaId ?? 'all')
    const level   = sel?.coords.vz ?? state.level ?? 0

    const base = window.location.href.split('#')[0] // absolute base, no hash
    const search = new URLSearchParams({
      level: String(level),
      vnum: sel?.vnum ?? '',
      cx: sel ? String(sel.coords.cx) : '',
      cy: sel ? String(sel.coords.cy) : '',
    }).toString()

    const absolute = `${base}#/renderer/${worldId}/${contId}/${areaId}?${search}`
    window.open(absolute, '_blank', 'noopener')
  }

  return (
    <button type="button" onClick={openRenderer}>
      Open Renderer
    </button>
  )
}
