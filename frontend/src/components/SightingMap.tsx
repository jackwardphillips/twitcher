import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default icon issues with Leaflet + Webpack/Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Sighting {
  id: number;
  species: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  observer: string;
}

interface SightingMapProps {
  sightings: Sighting[];
}

export const SightingMap = ({ sightings }: SightingMapProps) => {
  const sightingsWithCoords = sightings.filter(s => s.latitude !== null && s.longitude !== null);

  // Default center if no sightings (North America)
  const defaultCenter: [number, number] = [45, -95];
  const defaultZoom = 3;

  return (
    <div className="map-wrapper" style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sightingsWithCoords.map(s => (
          <Marker key={s.id} position={[s.latitude!, s.longitude!]}>
            <Popup>
              <strong>{s.species}</strong><br />
              {s.location}<br />
              <small>{new Date(s.date).toLocaleDateString()} by {s.observer}</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
