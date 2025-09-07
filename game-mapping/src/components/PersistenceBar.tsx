// src/components/PersistenceBar.tsx
import React from 'react'
import { useMap } from '@state/mapStore'
import { exportToFile, importFromFile, saveToLocal, clearLocal } from '../state/persist'

export default function PersistenceBar() {
  const { state, dispatch } = useMap()
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null)

  // reflect autosave timestamp when doc changes
  React.useEffect(() => {
    setLastSavedAt(Date.now())
  }, [state.doc.meta?.revision])

  const onExport = () => {
    exportToFile(state.doc, `mapdoc-${new Date().toISOString().replace(/[:.]/g,'-')}.json`)
  }

  const onImport = async (file?: File) => {
    try {
      if (!file) return
      const doc = await importFromFile(file)
      dispatch({ type: 'HYDRATE', doc })
      // force save immediately so autosave is in sync
      saveToLocal(doc)
      setLastSavedAt(Date.now())
      alert('Import complete ✔')
    } catch (e: any) {
      alert(`Import failed: ${e?.message || e}`)
    }
  }

  const onSnapshot = () => {
    const { savedAt } = saveToLocal(state.doc)
    setLastSavedAt(savedAt)
    alert('Snapshot saved to local storage ✔')
  }

  const onClear = () => {
    if (!confirm('Clear autosave from local storage? (Your in-memory work remains until reload)')) return
    clearLocal()
    alert('Autosave cleared.')
  }

  return (
    <div className="toolbar" style={{ gap: 6, borderBottom: '1px solid var(--line)' }}>
      <button onClick={onExport}>Export JSON</button>

      <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <span style={{ opacity:.85 }}>Import</span>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => onImport(e.target.files?.[0])}
        />
      </label>

      <button onClick={onSnapshot}>Save Snapshot</button>
      <button onClick={onClear}>Clear Autosave</button>

      <div style={{ marginLeft:'auto', fontSize:12, opacity:.8 }}>
        {lastSavedAt ? `autosaved ${new Date(lastSavedAt).toLocaleTimeString()}` : '—'}
      </div>
    </div>
  )
}
