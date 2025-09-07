// src/state/mapStore.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useRef,
} from "react";
import {
  MapDocV1,
  Room,
  RoomPatch,
  Direction,
  ExitDef,
  Category,
} from "../types";
import { saveToLocal, loadFromLocal } from "./persist";

// ----------------- State + Action types -----------------

export interface State {
  doc: MapDocV1;
  selected: string | null;
  level: number;
}

export type Action =
  | { type: "HYDRATE"; doc: MapDocV1 }
  | { type: "SELECT_ROOM"; vnum: string | null }
  | { type: "ADD_ROOM"; vnum: string }
  | { type: "DELETE_ROOM"; vnum: string }
  | { type: "PATCH_ROOM"; vnum: string; patch: RoomPatch }
  | { type: "UPSERT_EXIT"; vnum: string; dir: Direction; exit: ExitDef }
  | { type: "DELETE_EXIT"; vnum: string; dir: Direction }
  | { type: "SET_LEVEL"; level: number }
  | {
      type: "CATALOG_UPSERT";
      payload: { kind: "world" | "continent" | "area"; node: any };
    }
  | {
      type: "CATALOG_DELETE";
      payload: {
        kind: "world" | "continent" | "area";
        id: string;
        mode: "unassign";
      };
    };

// ----------------- Reducer -----------------

function bumpRevision(doc: MapDocV1) {
  doc.meta.revision = (doc.meta.revision ?? 0) + 1;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": {
      return { ...state, doc: action.doc };
    }
    case "SELECT_ROOM":
      return { ...state, selected: action.vnum };

    case "ADD_ROOM": {
      if (state.doc.rooms[action.vnum]) {
        return { ...state, selected: action.vnum };
      }
      const newRoom: Room = {
        vnum: action.vnum,
        coords: { cx: 0, cy: 0, vz: 0 },
        exits: {},
      };
      const doc = {
        ...state.doc,
        rooms: { ...state.doc.rooms, [action.vnum]: newRoom },
      };
      bumpRevision(doc);
      return { ...state, doc, selected: action.vnum };
    }

    case "DELETE_ROOM": {
      const { [action.vnum]: _, ...rest } = state.doc.rooms;
      const doc = { ...state.doc, rooms: rest };
      bumpRevision(doc);
      return {
        ...state,
        doc,
        selected: state.selected === action.vnum ? null : state.selected,
      };
    }

    case "PATCH_ROOM": {
      const r = state.doc.rooms[action.vnum];
      if (!r) return state;
      const patched = { ...r, ...action.patch };
      const doc = {
        ...state.doc,
        rooms: { ...state.doc.rooms, [action.vnum]: patched },
      };
      bumpRevision(doc);
      return { ...state, doc };
    }

    case "UPSERT_EXIT": {
      const r = state.doc.rooms[action.vnum];
      if (!r) return state;
      const exits = { ...r.exits, [action.dir]: action.exit };
      const doc = {
        ...state.doc,
        rooms: { ...state.doc.rooms, [action.vnum]: { ...r, exits } },
      };
      bumpRevision(doc);
      return { ...state, doc };
    }

    case "DELETE_EXIT": {
      const r = state.doc.rooms[action.vnum];
      if (!r) return state;
      const exits = { ...r.exits };
      delete exits[action.dir];
      const doc = {
        ...state.doc,
        rooms: { ...state.doc.rooms, [action.vnum]: { ...r, exits } },
      };
      bumpRevision(doc);
      return { ...state, doc };
    }

    case "SET_LEVEL":
      return { ...state, level: action.level };

    case "CATALOG_UPSERT": {
      const { kind, node } = action.payload;
      const doc = { ...state.doc, meta: { ...state.doc.meta } };
      if (!doc.meta.catalog) {
        doc.meta.catalog = { worlds: {}, continents: {}, areas: {} };
      }
      if (kind === "world") doc.meta.catalog.worlds[node.id] = node;
      if (kind === "continent") doc.meta.catalog.continents[node.id] = node;
      if (kind === "area") doc.meta.catalog.areas[node.id] = node;
      bumpRevision(doc);
      return { ...state, doc };
    }

    case "CATALOG_DELETE": {
      const { kind, id } = action.payload;
      const doc = { ...state.doc, meta: { ...state.doc.meta } };
      if (kind === "world") {
        const { [id]: _, ...rest } = doc.meta.catalog?.worlds || {};
        doc.meta.catalog!.worlds = rest;
      }
      if (kind === "continent") {
        const { [id]: _, ...rest } = doc.meta.catalog?.continents || {};
        doc.meta.catalog!.continents = rest;
      }
      if (kind === "area") {
        const { [id]: _, ...rest } = doc.meta.catalog?.areas || {};
        doc.meta.catalog!.areas = rest;
      }
      bumpRevision(doc);
      return { ...state, doc };
    }

    default:
      return state;
  }
}

// ----------------- Context -----------------

const MapCtx = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function useMap() {
  const ctx = useContext(MapCtx);
  if (!ctx) throw new Error("useMap must be used within MapProvider");
  return ctx;
}

export function MapProvider({ children }: { children: React.ReactNode }) {
  const initial: State = {
    doc: {
      meta: {
        directions: [],
        catalog: { worlds: {}, continents: {}, areas: {} },
      },
      rooms: {},
    },
    selected: null,
    level: 0,
  };

  // inside MapProvider -> hydrated useMemo(...)
  const hydrated = React.useMemo(() => {
    const loaded = loadFromLocal();
    if (loaded) {
      const meta = loaded.meta ?? {};
      return {
        doc: {
          meta: {
            directions: Array.isArray(meta.directions) ? meta.directions : [],
            catalog: meta.catalog ?? { worlds: {}, continents: {}, areas: {} },
            grid: meta.grid, // optional, preserve if present
            revision: meta.revision, // optional, preserve if present
          },
          rooms: loaded.rooms ?? {},
        },
        selected: null,
        level: 0,
      } as State;
    }
    return initial;
  }, []);

  const [state, dispatch] = useReducer(reducer, hydrated);

  // autosave
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        saveToLocal(state.doc);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state.doc]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MapCtx.Provider value={value}>{children}</MapCtx.Provider>;
}
