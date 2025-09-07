// src/pages/RendererPage.tsx
import React from "react";
import { loadFromLocal } from "../state/persist";
import { TerrainKind, MapDocV1, Room } from "../types";
import OctRenderer from "../render/OctRenderer"; // your octagon renderer
import { useSearchParams, useParams } from "react-router-dom";

const LS_KEY = "dslmapper:mapdoc:v1";

export default function RendererPage() {
  const { world = "all", continent = "all", area = "all" } = useParams();
  const [search] = useSearchParams();
  const level = Number(search.get("level") ?? "0");
  const focusVnum = search.get("vnum") ?? null;

  const [doc, setDoc] = React.useState<MapDocV1>(() => {
    return (
      loadFromLocal() ?? {
        meta: {
          directions: [],
          catalog: { worlds: {}, continents: {}, areas: {} },
        },
        rooms: {},
      }
    );
  });

  // Live re-hydrate when editor autosaves
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as MapDocV1;
        setDoc(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Filter rooms by scope + level
  const rooms: Room[] = React.useMemo(() => {
    const arr = Object.values(doc.rooms);
    const matchesScope = (r: Room) => {
      const wOk = world === "all" || r.category?.worldId === world;
      const cOk = continent === "all" || r.category?.continentId === continent;
      const aOk = area === "all" || r.category?.areaId === area;
      return wOk && cOk && aOk;
    };
    return arr.filter((r) => matchesScope(r) && r.coords.vz === level);
  }, [doc, world, continent, area, level]);

  const primaryVnum = React.useMemo(() => {
    if (area !== "all") {
      const a = doc.meta.catalog?.areas?.[area];
      return a?.primaryVnum || null;
    }
    // if viewing continent/world/all, no single primary (or you could pick each area's primary)
    return null;
  }, [doc, area]);

  return (
    <div className="renderer-page">
      <OctRenderer
        rooms={rooms}
        level={level}
        focusVnum={null} // stop using editor selection for highlight
        primaryVnum={primaryVnum} // <-- NEW
        centerCx={search.get("cx") ? Number(search.get("cx")) : undefined}
        centerCy={search.get("cy") ? Number(search.get("cy")) : undefined}
      />
    </div>
  );
}
