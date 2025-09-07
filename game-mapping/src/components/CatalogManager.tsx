// src/components/CatalogManager.tsx
import React from 'react'
import { useMap } from '@state/mapStore'

export default function CatalogManager() {
  const { dispatch } = useMap()

  const addWorld = () => {
    const name = prompt('World name?')?.trim()
    if (!name) return
    const id = crypto.randomUUID()
    dispatch({ type: 'CATALOG_UPSERT', payload: { kind: 'world', node: { id, name } } })
  }

  const addContinent = () => {
    const name = prompt('Continent name?')?.trim()
    if (!name) return
    const id = crypto.randomUUID()
    dispatch({ type: 'CATALOG_UPSERT', payload: { kind: 'continent', node: { id, name } } })
  }

  const addArea = () => {
    const name = prompt('Area name?')?.trim()
    if (!name) return
    const id = crypto.randomUUID()
    dispatch({ type: 'CATALOG_UPSERT', payload: { kind: 'area', node: { id, name } } })
  }

  const addRoom = () => {
    const vnum = prompt('Room vnum?')?.trim()
    if (!vnum) return
    dispatch({ type: 'ADD_ROOM', vnum })
    dispatch({ type: 'SELECT_ROOM', vnum })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button onClick={addWorld}>+ World</button>
      <button onClick={addContinent}>+ Continent</button>
      <button onClick={addArea}>+ Area</button>
      <button onClick={addRoom}>+ Room</button>
    </div>
  )
}
