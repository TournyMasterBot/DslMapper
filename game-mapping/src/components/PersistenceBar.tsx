// src/components/PersistenceBar.tsx
import React from "react";
import { useMap, normalizeDoc } from "@state/mapStore";
import {
  exportToFile,
  importFromFile,
  saveToLocal,
  clearLocal,
} from "../state/persist";
import { toAsciiArea } from "../render/ascii";
import { buildRenderScope } from "@state/scope";
import { renderAreaSVG } from "../render/svgExport";

export default function PersistenceBar() {
  const { state, dispatch } = useMap();
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);

  // reflect autosave timestamp when doc changes
  React.useEffect(() => {
    setLastSavedAt(Date.now());
  }, [state.doc.meta?.revision]);

  const onExport = () => {
    const normalized = normalizeDoc(state.doc);
    exportToFile(
      normalized,
      `mapdoc-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
  };

  const onImport = async (file?: File) => {
    try {
      if (!file) return;
      const doc = await importFromFile(file);
      const normalized = normalizeDoc(doc);
      dispatch({ type: "HYDRATE", doc: normalized });
      saveToLocal(normalized);
      setLastSavedAt(Date.now());
      alert("Import complete ✔");
    } catch (e: any) {
      alert(`Import failed: ${e?.message || e}`);
    }
  };

  const onSnapshot = () => {
    const normalized = normalizeDoc(state.doc);
    const { savedAt } = saveToLocal(normalized);
    setLastSavedAt(savedAt);
    alert("Snapshot saved to local storage ✔");
  };

  const onClear = () => {
    if (!confirm("Clear autosave from local storage? (Your in-memory work remains until reload)"))
      return;
    clearLocal();
    alert("Autosave cleared.");
  };

  // ASCII export using the SAME scope as "Open Renderer"
  const onExportAsciiFromScope = () => {
    const scope = buildRenderScope(state);
    if (scope.areaId === "all") {
      alert("Select a room within an Area first (so export knows which Area to use).");
      return;
    }

    const doc = normalizeDoc(state.doc);
    const level = scope.vz ?? scope.level ?? 0;
    const areaId = scope.areaId;

    try {
      const ascii = toAsciiArea(doc, areaId, level);
      if (!ascii?.trim()) {
        alert("Nothing to export for that area/level.");
        return;
      }
      const areaName =
        doc.meta.catalog?.areas?.[areaId]?.name?.replace(/\s+/g, "_") || areaId;
      const blob = new Blob([ascii], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `area-${areaName}-vz${level}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`ASCII export failed: ${e?.message || e}`);
    }
  };

  const onExportSvgFromScope = () => {
    const scope = buildRenderScope(state);
    if (scope.areaId === "all") {
      alert("Select a room within an Area first so SVG knows which Area to export.");
      return;
    }
    const doc = normalizeDoc(state.doc);
    const svg = renderAreaSVG(doc, scope.areaId, scope.vz ?? scope.level ?? 0, {});
    const areaName =
      doc.meta.catalog?.areas?.[scope.areaId]?.name?.replace(/\s+/g, "_") ||
      scope.areaId;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `area-${areaName}-vz${scope.vz ?? scope.level ?? 0}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="toolbar"
      style={{ gap: 6, borderBottom: "1px solid var(--line)" }}
    >
      <button onClick={onExport}>Export JSON</button>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ opacity: 0.85 }}>Import</span>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => onImport(e.target.files?.[0])}
        />
      </label>

      <button onClick={onSnapshot}>Save Snapshot</button>
      <button onClick={onClear}>Clear Autosave</button>
      <button onClick={onExportSvgFromScope}>Download SVG</button>
      {/* ASCII export based on the same scope as "Open Renderer" */}
      <button onClick={onExportAsciiFromScope}>Download ASCII</button>

      <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
        {lastSavedAt
          ? `autosaved ${new Date(lastSavedAt).toLocaleTimeString()}`
          : "—"}
      </div>
    </div>
  );
}
