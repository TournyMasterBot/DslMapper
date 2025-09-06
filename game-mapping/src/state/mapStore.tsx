// src/state/mapStore.tsx
import React, { createContext, useContext, useReducer } from 'react'
import { MapDocV1, Room, RoomPatch, Direction, DIRECTIONS, ExitDef } from '../types'

const initialDoc: MapDocV1 = {
  meta: { directions: DIRECTIONS, grid: { type: 'hex', orientation: 'pointy', coords: 'axial' } },
  rooms: {}
}

export interface ViewState { currentLevel: number | 'all' }
export interface MapState {
  doc: MapDocV1
  view: ViewState
  selectedVnum: string | null
}

const initState: MapState = { doc: initialDoc, view: { currentLevel: 'all' }, selectedVnum: null }

type Action =
  | { type: 'ADD_ROOM', vnum: string }
  | { type: 'DELETE_ROOM', vnum: string }
  | { type: 'PATCH_ROOM', vnum: string, patch: RoomPatch }
  | { type: 'SELECT_ROOM', vnum: string | null }
  | { type: 'UPSERT_EXIT', vnum: string, dir: Direction, exit: ExitDef }
  | { type: 'DELETE_EXIT', vnum: string, dir: Direction }
  | { type: 'SET_LEVEL', level: number | 'all' }
  | { type: 'HYDRATE', doc: MapDocV1 }

function reducer(state: MapState, action: Action): MapState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, doc: action.doc }
    case 'ADD_ROOM': {
      if (state.doc.rooms[action.vnum]) return state
      const room: Room = { vnum: action.vnum, exits: {} }
      return { ...state, doc: { ...state.doc, rooms: { ...state.doc.rooms, [action.vnum]: room } }, selectedVnum: action.vnum }
    }
    case 'DELETE_ROOM': {
      const { [action.vnum]: _, ...rest } = state.doc.rooms
      const selectedVnum = state.selectedVnum === action.vnum ? null : state.selectedVnum
      return { ...state, doc: { ...state.doc, rooms: rest }, selectedVnum }
    }
    case 'PATCH_ROOM': {
      const room = state.doc.rooms[action.vnum]
      if (!room) return state
      const next: Room = { ...room, ...action.patch }
      return { ...state, doc: { ...state.doc, rooms: { ...state.doc.rooms, [action.vnum]: next } } }
    }
    case 'SELECT_ROOM':
      return { ...state, selectedVnum: action.vnum }
    case 'UPSERT_EXIT': {
      const room = state.doc.rooms[action.vnum]
      if (!room) return state
      const exits = { ...room.exits, [action.dir]: action.exit }
      return { ...state, doc: { ...state.doc, rooms: { ...state.doc.rooms, [action.vnum]: { ...room, exits } } } }
    }
    case 'DELETE_EXIT': {
      const room = state.doc.rooms[action.vnum]
      if (!room) return state
      const { [action.dir]: __, ...restExits } = room.exits
      return { ...state, doc: { ...state.doc, rooms: { ...state.doc.rooms, [action.vnum]: { ...room, exits: restExits } } } }
    }
    case 'SET_LEVEL':
      return { ...state, view: { currentLevel: action.level } }
    default:
      return state
  }
}

const MapCtx = createContext<{ state: MapState, dispatch: React.Dispatch<Action> } | null>(null)

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initState)

  // Load from localStorage once
  React.useEffect(() => {
    const saved = localStorage.getItem('gm_doc_v1')
    if (saved) {
      try { dispatch({ type: 'HYDRATE', doc: JSON.parse(saved) as MapDocV1 }) } catch {}
    }
  }, [])

  // Persist changes
  React.useEffect(() => {
    localStorage.setItem('gm_doc_v1', JSON.stringify(state.doc))
  }, [state.doc])

  return <MapCtx.Provider value={{ state, dispatch }}>{children}</MapCtx.Provider>
}

export function useMap() {
  const ctx = useContext(MapCtx)
  if (!ctx) throw new Error('useMap must be used within MapProvider')
  return ctx
}
