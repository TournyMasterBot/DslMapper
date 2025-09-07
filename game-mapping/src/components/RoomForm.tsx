import React from "react";
import { useMap } from "@state/mapStore";
import { dirToGrid } from "../render/dir";

export default function RoomForm({ vnum }: { vnum: string }) {
  const { state, dispatch } = useMap();
  const room = state.doc.rooms[vnum];
  if (!room) return null;

  // Local string state so the user can type "-", "" etc. before committing a number
  const [label, setLabel] = React.useState(room.label ?? "");
  const [cx, setCx] = React.useState(String(room.coords.cx));
  const [cy, setCy] = React.useState(String(room.coords.cy));
  const [vz, setVz] = React.useState(String(room.coords.vz));

  React.useEffect(() => {
    const r = state.doc.rooms[vnum];
    if (!r) return;
    setLabel(r.label ?? "");
    setCx(String(r.coords.cx));
    setCy(String(r.coords.cy));
    setVz(String(r.coords.vz));
  }, [vnum, state.doc.rooms]);

  const patch = (patch: Partial<typeof room>) =>
    dispatch({ type: "PATCH_ROOM", vnum, patch });

  const commitNumber = (key: "cx" | "cy" | "vz", val: string) => {
    // Only commit when it's a valid integer (including negatives)
    if (!/^-?\d+$/.test(val)) return;
    const n = parseInt(val, 10);
    const next = { ...room.coords, [key]: n };
    patch({ coords: next });
  };

  const move = (dir: string) => {
    const [dx, dy, dz] = dirToGrid(dir as any);
    const next = {
      cx: room.coords.cx + dx,
      cy: room.coords.cy + dy,
      vz: room.coords.vz + dz,
    };
    patch({ coords: next });
    setCx(String(next.cx));
    setCy(String(next.cy));
    setVz(String(next.vz));
  };

  return (
    <div style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6 }}>
      <h3 style={{ marginTop: 0 }}>Edit Room</h3>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <div><strong>VNUM:</strong> {vnum}</div>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Name</span>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              patch({ label: e.target.value || undefined });
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Coordinates (cx, cy, vz)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              inputMode="numeric"
              value={cx}
              onChange={(e) => setCx(e.target.value)}
              onBlur={() => commitNumber("cx", cx)}
              style={{ width: 80 }}
            />
            <input
              type="number"
              inputMode="numeric"
              value={cy}
              onChange={(e) => setCy(e.target.value)}
              onBlur={() => commitNumber("cy", cy)}
              style={{ width: 80 }}
            />
            <input
              type="number"
              inputMode="numeric"
              value={vz}
              onChange={(e) => setVz(e.target.value)}
              onBlur={() => commitNumber("vz", vz)}
              style={{ width: 80 }}
            />
          </div>
        </label>

        {/* Movement controls (star pattern) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 240 }}>
          <button type="button" onClick={() => move("NW")}>NW</button>
          <button type="button" onClick={() => move("N")}>N</button>
          <button type="button" onClick={() => move("NE")}>NE</button>

          <button type="button" onClick={() => move("W")}>W</button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>&middot;</div>
          <button type="button" onClick={() => move("E")}>E</button>

          <button type="button" onClick={() => move("SW")}>SW</button>
          <button type="button" onClick={() => move("S")}>S</button>
          <button type="button" onClick={() => move("SE")}>SE</button>
        </div>

        {/* Vertical movement (U/D) */}
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => move("U")}>U</button>
          <button type="button" onClick={() => move("D")}>D</button>
        </div>
      </div>
    </div>
  );
}
