import { MapProvider } from './state/mapStore'
import MapEditor from './components/MapEditor'
import './styles/layout.scss'

export default function App() {
return (
<MapProvider>
<MapEditor />
</MapProvider>
)
}