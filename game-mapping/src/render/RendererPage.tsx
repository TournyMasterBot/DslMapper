// src/pages/RendererPage.tsx
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMap } from "@state/mapStore";
import OctRenderer from "../render/OctRenderer";
import { buildRenderScope } from "../state/scope";

export default function RendererPage() {
  const { state } = useMap();
  const params = useParams<{
    worldId?: string;
    continentId?: string;
    areaId?: string;
  }>();
  const [search] = useSearchParams();

  // Scope from URL if present, else fallback to the same logic Toolbar uses
  const fallback = buildRenderScope(state);

  const worldId = params.worldId ?? fallback.worldId;
  const continentId = params.continentId ?? fallback.continentId;
  const areaId = params.areaId ?? fallback.areaId;

  const level = Number(search.get("level") ?? fallback.vz ?? 0);
  const focusVnum = search.get("vnum") ?? undefined;
  const centerCx = search.has("cx") ? Number(search.get("cx")) : undefined;
  const centerCy = search.has("cy") ? Number(search.get("cy")) : undefined;

  // Filter rooms by scope
  const rooms = React.useMemo(() => {
    return Object.values(state.doc.rooms).filter((r) => {
      if (r.coords.vz !== level) return false;
      if (areaId !== "all") return r.category?.areaId === areaId;
      if (continentId !== "all") return r.category?.continentId === continentId;
      if (worldId !== "all") return r.category?.worldId === worldId;
      return true;
    });
  }, [state.doc.rooms, worldId, continentId, areaId, level]);

  // Find primary for area scope (if any)
  const primaryVnum =
    areaId !== "all"
      ? state.doc.meta.catalog?.areas?.[areaId]?.primaryVnum ?? undefined
      : undefined;

  // Optional: keep last render in localStorage (handy for other components)
  React.useEffect(() => {
    try {
      localStorage.setItem(
        "dslmapper:lastRender",
        JSON.stringify({ worldId, continentId, areaId, level })
      );
    } catch {}
  }, [worldId, continentId, areaId, level]);

  return (
    <div style={{ height: "100vh", background: "#0f0f10" }}>
      <svg width="0" height="0" style={{ position: "absolute" }} />
      <div style={{ width: "100%", height: "100%" }}>
        <OctRenderer
          rooms={rooms}
          level={level}
          primaryVnum={primaryVnum}
          centerCx={centerCx}
          centerCy={centerCy}
          focusVnum={focusVnum}
        />
      </div>
    </div>
  );
}
