// src/state/persist.ts
import { MapDocV1 } from '../types'

const LS_KEY = 'dslmapper:mapdoc:v1'

export type PersistInfo = {
  savedAt: number
  size: number
}

export function saveToLocal(doc: MapDocV1): PersistInfo {
  const json = JSON.stringify(doc)
  localStorage.setItem(LS_KEY, json)
  return { savedAt: Date.now(), size: json.length }
}

export function loadFromLocal(): MapDocV1 | null {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MapDocV1
    return parsed
  } catch {
    return null
  }
}

export function clearLocal() {
  localStorage.removeItem(LS_KEY)
}

export function exportToFile(doc: MapDocV1, filename = 'mapdoc.json') {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importFromFile(file: File): Promise<MapDocV1> {
  const text = await file.text()
  const parsed = JSON.parse(text) as MapDocV1
  return parsed
}
