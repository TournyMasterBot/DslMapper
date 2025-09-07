import { MapProvider } from "@state/mapStore";
import MapEditor from "./components/MapEditor";
import MapAreaPage from "./pages/MapAreaPage";
import MapRoomPage from "./pages/MapRoomPage";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  HashRouter,
} from "react-router-dom";
import "./styles/layout.scss";
import "./styles/renderer.scss";
import RendererPage from "./render/RendererPage";

export default function App() {
  return (
    <MapProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MapEditor />} />
          <Route path="/map/room/:vnum" element={<MapRoomPage />} />
          <Route path="/map/:continent/:area" element={<MapAreaPage />} />
          <Route path="/renderer" element={<RendererPage />} />{" "}
          <Route path="/renderer/:worldId/:continentId/:areaId" element={<RendererPage />} />
          <Route path="/renderer/room/:vnum" element={<RendererPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </MapProvider>
  );
}
