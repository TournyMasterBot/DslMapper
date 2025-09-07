// src/components/RoomList.tsx
import React from 'react'
import { useMap } from '@state/mapStore'
import CatalogManager from './CatalogManager'
import ContextMenu from './ContextMenu'

type TreeOpen = {
  worlds: Record<string, boolean>
  continents: Record<string, boolean>
  areas: Record<string, boolean>
  unassigned: boolean
}

type TargetKind = 'world' | 'continent' | 'area' | 'room' | 'unassigned'

const sortByName = <T extends { name?: string; id: string }>(a: T, b: T) =>
  (a.name || a.id).localeCompare(b.name || b.id, undefined, { sensitivity: 'base' })

const roomLabel = (vnum: string, label?: string) => (label?.trim() || vnum)

export default function RoomList() {
  const { state, dispatch } = useMap()
  const doc = state.doc
  const catalog = doc.meta.catalog ?? { worlds: {}, continents: {}, areas: {} }

  // Build indices
  const worlds = Object.values(catalog.worlds).sort(sortByName)
  const continentsByWorld: Record<string, Array<{ id: string; name?: string; worldId?: string }>> = {}
  for (const c of Object.values(catalog.continents)) (continentsByWorld[c.worldId ?? ''] ||= []).push(c)
  for (const k in continentsByWorld) continentsByWorld[k].sort(sortByName)

  const areasByContinent: Record<string, Array<{ id: string; name?: string; worldId?: string; continentId?: string }>> = {}
  for (const a of Object.values(catalog.areas)) (areasByContinent[a.continentId ?? ''] ||= []).push(a)
  for (const k in areasByContinent) areasByContinent[k].sort(sortByName)

  // Rooms grouped by area (+ Unassigned)
  const UNASSIGNED = '_unassigned'
  const roomsByArea: Record<string, { vnum: string; label?: string }[]> = {}
  for (const r of Object.values(doc.rooms)) {
    const areaId = r.category?.areaId ?? UNASSIGNED
    ;(roomsByArea[areaId] ||= []).push({ vnum: r.vnum, label: r.label })
  }
  for (const k in roomsByArea) {
    roomsByArea[k].sort((a, b) =>
      roomLabel(a.vnum, a.label).localeCompare(roomLabel(b.vnum, b.label), undefined, { sensitivity: 'base' })
    )
  }

  // Expand/collapse
  const [open, setOpen] = React.useState<TreeOpen>(() => ({
    worlds: {}, continents: {}, areas: {}, unassigned: true,
  }))
  const toggle = (type: keyof TreeOpen, id?: string) => {
    setOpen(prev => {
      if (type === 'unassigned') return { ...prev, unassigned: !prev.unassigned }
      if (type === 'worlds' && id) return { ...prev, worlds: { ...prev.worlds, [id]: !prev.worlds[id] } }
      if (type === 'continents' && id) return { ...prev, continents: { ...prev.continents, [id]: !prev.continents[id] } }
      if (type === 'areas' && id) return { ...prev, areas: { ...prev.areas, [id]: !prev.areas[id] } }
      return prev
    })
  }

  // Selection
  const selectRoom = (vnum: string) => dispatch({ type: 'SELECT_ROOM', vnum })

  // Context menu
  const [menu, setMenu] = React.useState<{ open: boolean; x: number; y: number; target?: { kind: TargetKind; id: string; label: string } }>({ open:false, x:0, y:0 })
  const openMenu = (e: React.MouseEvent, kind: TargetKind, id: string, label: string) => {
    e.preventDefault(); e.stopPropagation()
    setMenu({ open:true, x:e.pageX, y:e.pageY, target:{ kind, id, label } })
  }
  const closeMenu = () => setMenu(m => ({ ...m, open:false }))

  const handleDelete = () => {
    if (!menu.target) return
    const { kind, id, label } = menu.target
    if (kind === 'room') {
      if (confirm(`Delete room ${label}?`)) dispatch({ type: 'DELETE_ROOM', vnum: id })
      return
    }
    if (kind === 'unassigned') return
    if (confirm(`Delete ${kind} "${label}"?`)) {
      dispatch({ type: 'CATALOG_DELETE', payload: { kind, id, mode: 'unassign' } })
    }
  }

  const handleRename = () => {
    if (!menu.target) return
    const { kind, id, label } = menu.target
    const next = prompt(`Rename ${kind}`, label)?.trim()
    if (!next) return
    if (kind === 'world') dispatch({ type: 'CATALOG_UPSERT', payload: { kind, node: { ...catalog.worlds[id], name: next } } })
    if (kind === 'continent') dispatch({ type: 'CATALOG_UPSERT', payload: { kind, node: { ...catalog.continents[id], name: next } } })
    if (kind === 'area') dispatch({ type: 'CATALOG_UPSERT', payload: { kind, node: { ...catalog.areas[id], name: next } } })
    if (kind === 'room') dispatch({ type: 'PATCH_ROOM', vnum: id, patch: { label: next } })
  }

  // Drag & drop
  const [dragOver, setDragOver] = React.useState<{ kind: TargetKind; id: string } | null>(null)

  const onDragStartRoom = (e: React.DragEvent, vnum: string) => {
    e.dataTransfer.setData('text/x-room-vnum', vnum)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOverTarget = (e: React.DragEvent, kind: TargetKind, id: string) => {
    if (kind === 'room') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ kind, id })
  }

  const onDragLeaveTarget = (_e: React.DragEvent, kind: TargetKind, id: string) => {
    setDragOver(prev => (prev && prev.kind === kind && prev.id === id ? null : prev))
  }

  const onDropTarget = (e: React.DragEvent, kind: TargetKind, id: string) => {
    const vnum = e.dataTransfer.getData('text/x-room-vnum')
    setDragOver(null)
    if (!vnum) return

    if (kind === 'unassigned') {
      dispatch({ type: 'PATCH_ROOM', vnum, patch: { category: {} } })
      return
    }

    if (kind === 'world') {
      dispatch({ type: 'PATCH_ROOM', vnum, patch: { category: { worldId: id } as any } })
      return
    }

    if (kind === 'continent') {
      const cont = catalog.continents[id]
      if (!cont) return
      dispatch({ type: 'PATCH_ROOM', vnum, patch: { category: { worldId: cont.worldId, continentId: id } as any } })
      return
    }

    if (kind === 'area') {
      const area = catalog.areas[id]
      if (!area) return
      dispatch({ type: 'PATCH_ROOM', vnum, patch: { category: { worldId: area.worldId, continentId: area.continentId, areaId: id } as any } })
      return
    }
  }

  const dropClass = (kind: TargetKind, id: string) =>
    dragOver && dragOver.kind === kind && dragOver.id === id ? { background: 'rgba(255,255,255,0.06)', borderRadius: 6 } : undefined

  // -------- render --------
  const renderRoom = (r: { vnum: string; label?: string }) => (
    <li key={r.vnum} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        title="Drag room"
        draggable
        onDragStart={(e) => onDragStartRoom(e, r.vnum)}
        onContextMenu={(e) => openMenu(e, 'room', r.vnum, roomLabel(r.vnum, r.label))}
        style={{
          cursor: 'grab',
          userSelect: 'none',
          opacity: 0.8,
          padding: '0 4px',
        }}
      >
        ⋮⋮
      </span>
      <button
        onClick={() => selectRoom(r.vnum)}
        onContextMenu={(e) => openMenu(e, 'room', r.vnum, roomLabel(r.vnum, r.label))}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px 0',
          textAlign: 'left',
          color: 'inherit',
          width: '100%',
          cursor: 'pointer',
          opacity: state.selected === r.vnum ? 1 : 0.9,
          fontWeight: state.selected === r.vnum ? 700 : 400,
        }}
        title={r.vnum}
      >
        {roomLabel(r.vnum, r.label)}
      </button>
    </li>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
      <CatalogManager />

      {/* Worlds */}
      {worlds.map(w => {
        const wOpen = open.worlds[w.id] ?? true
        return (
          <div key={w.id} style={{ marginBottom: 8 }}>
            <div
              onClick={() => toggle('worlds', w.id)}
              onContextMenu={(e) => openMenu(e, 'world', w.id, w.name || w.id)}
              onDragOver={(e) => onDragOverTarget(e, 'world', w.id)}
              onDragLeave={(e) => onDragLeaveTarget(e, 'world', w.id)}
              onDrop={(e) => onDropTarget(e, 'world', w.id)}
              style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, padding: '2px 4px', ...dropClass('world', w.id) }}
            >
              {wOpen ? '▾' : '▸'} {w.name || w.id}
            </div>
            {wOpen && (
              <div style={{ marginLeft: 14 }}>
                {(continentsByWorld[w.id] || []).map(c => {
                  const cOpen = open.continents[c.id] ?? true
                  return (
                    <div key={c.id} style={{ marginBottom: 6 }}>
                      <div
                        onClick={() => toggle('continents', c.id)}
                        onContextMenu={(e) => openMenu(e, 'continent', c.id, c.name || c.id)}
                        onDragOver={(e) => onDragOverTarget(e, 'continent', c.id)}
                        onDragLeave={(e) => onDragLeaveTarget(e, 'continent', c.id)}
                        onDrop={(e) => onDropTarget(e, 'continent', c.id)}
                        style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500, padding: '2px 4px', ...dropClass('continent', c.id) }}
                      >
                        {cOpen ? '▾' : '▸'} {c.name || c.id}
                      </div>
                      {cOpen && (
                        <div style={{ marginLeft: 14 }}>
                          {(areasByContinent[c.id] || []).map(a => {
                            const aOpen = open.areas[a.id] ?? true
                            const areaRooms = roomsByArea[a.id] || []
                            return (
                              <div key={a.id} style={{ marginBottom: 4 }}>
                                <div
                                  onClick={() => toggle('areas', a.id)}
                                  onContextMenu={(e) => openMenu(e, 'area', a.id, a.name || a.id)}
                                  onDragOver={(e) => onDragOverTarget(e, 'area', a.id)}
                                  onDragLeave={(e) => onDragLeaveTarget(e, 'area', a.id)}
                                  onDrop={(e) => onDropTarget(e, 'area', a.id)}
                                  style={{ cursor: 'pointer', userSelect: 'none', padding: '2px 4px', ...dropClass('area', a.id) }}
                                >
                                  {aOpen ? '▾' : '▸'} {a.name || a.id}{' '}
                                  <span style={{ opacity: 0.7, fontSize: 12 }}>({areaRooms.length})</span>
                                </div>
                                {aOpen && areaRooms.length > 0 && (
                                  <ul style={{ margin: '4px 0 0 18px', padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
                                    {areaRooms.map(renderRoom)}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Unassigned bucket */}
      <div style={{ marginTop: 8 }}>
        <div
          onClick={() => toggle('unassigned')}
          onContextMenu={(e) => openMenu(e, 'unassigned', UNASSIGNED, '(Unassigned)')}
          onDragOver={(e) => onDragOverTarget(e, 'unassigned', UNASSIGNED)}
          onDragLeave={(e) => onDragLeaveTarget(e, 'unassigned', UNASSIGNED)}
          onDrop={(e) => onDropTarget(e, 'unassigned', UNASSIGNED)}
          style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, padding: '2px 4px', ...dropClass('unassigned', UNASSIGNED) }}
        >
          {open.unassigned ? '▾' : '▸'} (Unassigned){' '}
          <span style={{ opacity: 0.7, fontSize: 12 }}>({roomsByArea[UNASSIGNED]?.length ?? 0})</span>
        </div>
        {open.unassigned && (roomsByArea[UNASSIGNED]?.length ? (
          <ul style={{ margin: '4px 0 0 18px', padding: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {roomsByArea[UNASSIGNED].map(renderRoom)}
          </ul>
        ) : null)}
      </div>

      {/* Context menu */}
      {menu.open && menu.target && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          items={[
            { label: 'Rename…', onClick: handleRename },
            { label: 'Delete…', onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </div>
  )
}
