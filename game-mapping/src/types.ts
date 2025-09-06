// src/types.ts
export type Direction = 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'U'|'D'
export const DIRECTIONS: Direction[] = ['N','NE','E','SE','S','SW','W','U','D']

export type Door =
  | null
  | { type: 'simple' }
  | { type: 'locked', keyId: string }

export type ExitStatus = 'unknown' | 'created' | 'confirmed' | 'anomalous'

export interface ExitDef {
  to: string | null
  oneWay: boolean
  door: Door
  status: ExitStatus
  requirements?: string[]
  note?: string
}

export interface RoomFlags { [key: string]: boolean | number | string }

export interface RoomObject {
  id: string
  name: string
  flags?: RoomFlags
}

export type Effect =
  | { Message: { text: string } }
  | { CreateExit: { dir: Direction, to: string | null, status: ExitStatus, oneWay?: boolean, door?: Door } }
  | { RevealExit: { dir: Direction } }
  | { UnlockDoor: { dir: Direction, keyId?: string } }
  | { ToggleDoor: { dir: Direction, state: 'open'|'closed'|'locked' } }
  | { Warp: { to: string } }
  | { SetFlag: { scope: 'room'|'object', id?: string, key: string, value: boolean | number | string } }

export interface InteractionWhen {
  dir?: Direction | null
  roomFlags?: { key: string, equals: boolean | number | string }[]
  objectFlags?: { id: string, key: string, equals: boolean | number | string }[]
  requirements?: {
    skills?: { name: string, dc: number }[]
    tools?: { name: string, optional?: boolean }[]
    movement?: string[]
  }
}

export interface Interaction {
  verb: 'dig' | 'push' | 'pull' | 'shove' | string
  target?: string | null
  when?: InteractionWhen
  effects: Effect[]
}

export interface Room {
  vnum: string
  label?: string
  sector?: string
  coords?: { q: number, r: number, level: number }
  movement?: { requires?: string[], bans?: string[] }
  flags?: RoomFlags
  objects?: RoomObject[]
  exits: Partial<Record<Direction, ExitDef>>
  interactions?: Interaction[]
}

export interface MapDocMeta {
  directions: Direction[]
  grid?: { type: 'hex', orientation: 'pointy'|'flat', coords: 'axial'|'cube' }
}

export interface MapDocV1 {
  meta: MapDocMeta
  rooms: Record<string, Room>
}

export type RoomPatch = Partial<Omit<Room, 'vnum'>>
