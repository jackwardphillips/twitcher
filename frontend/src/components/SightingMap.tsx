import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { type Incident } from './Dashboard.js';

// Fix for default icon issues with Leaflet + Webpack/Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SightingMapProps {
  incidents: Incident[];
}

export const SightingMap = ({ incidents }: SightingMapProps) => {
  // Default center if no incidents (North America)
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
        {incidents.map(incident => (
          <Marker key={incident.id} position={[incident.centroidLat, incident.centroidLng]}>
            <Popup>
              <strong>{incident.commonName}</strong><br />
              {incident.locationName}<br />
              <small>Active {incident.activeDays} {incident.activeDays === 1 ? 'day' : 'days'} ({incident.sightingCount} reports)</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
