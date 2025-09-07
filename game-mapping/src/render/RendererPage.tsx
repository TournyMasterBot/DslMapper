// src/pages/RendererPage.tsx
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useMap } from "@state/mapStore";
import OctRenderer from "../render/OctRenderer";
import { Room } from "../types";

export default function RendererPage() {
  const { state } = useMap();
  const { worldId = "all", continentId = "all", areaId = "all" } = useParams();
  const search = new URLSearchParams(useLocation().search);

  const level = Number(search.get("level") ?? 0);
  const focusVnum = search.get("vnum");
  const centerCx = search.has("cx") ? Number(search.get("cx")) : undefined;
  const centerCy = search.has("cy") ? Number(search.get("cy")) : undefined;

  // scope filter (all = no filter)
  const matchesScope = (r: Room) => {
    if (worldId !== "all" && r.category?.worldId !== worldId) return false;
    if (continentId !== "all" && r.category?.continentId !== continentId)
      return false;
    if (areaId !== "all" && r.category?.areaId !== areaId) return false;
    return true;
  };

  const roomsAtLevel = React.useMemo(
    () =>
      Object.values(state.doc.rooms).filter(
        (r) => r.coords.vz === level && matchesScope(r)
      ),
    [state.doc.rooms, level, worldId, continentId, areaId]
  );

  const primaryVnum =
    areaId !== "all"
      ? state.doc.meta.catalog?.areas?.[areaId]?.primaryVnum ?? null
      : null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <OctRenderer
        rooms={roomsAtLevel}
        level={level}
        focusVnum={focusVnum}
        primaryVnum={primaryVnum || undefined}
        centerCx={centerCx}
        centerCy={centerCy}
      />
    </div>
  );
}
