import { useEffect, useRef } from 'react';
import maplibregl, { type Map, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRarityColor } from '../lib/rarity-utils.js';
import { type Incident } from './Dashboard.js';

interface SightingMapProps {
  incidents: Incident[];
}

const DEFAULT_CENTER: [number, number] = [-95, 45];
const DEFAULT_ZOOM = 3;
const MAP_PITCH = 38;
const MAP_BEARING = -8;
const TERRAIN_SOURCE_IDS = ['terrain', 'maptiler-terrain'];

const buildMaptilerStyleUrl = () => {
  const maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;
  const maptilerStyleUrl = import.meta.env.VITE_MAPTILER_STYLE_URL as string | undefined;

  if (!maptilerApiKey || !maptilerStyleUrl) return null;

  const styleUrl = maptilerStyleUrl.trim();
  const encodedKey = encodeURIComponent(maptilerApiKey);

  if (styleUrl.includes('{key}')) {
    return styleUrl.replace('{key}', encodedKey);
  }

  if (/[?&]key=/.test(styleUrl)) {
    return styleUrl;
  }

  const separator = styleUrl.includes('?') ? '&' : '?';
  return `${styleUrl}${separator}key=${encodedKey}`;
};

const getIncidentRarity = (incident: Incident) => {
  return incident.abaCode === null || incident.abaCode === 0 ? 5 : incident.abaCode;
};

const escapeHtml = (value: string | number) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const createMarkerElement = (color: string) => {
  const marker = document.createElement('button');
  marker.className = 'sighting-map-marker';
  marker.type = 'button';
  marker.setAttribute('aria-label', 'Bird sighting');
  marker.style.setProperty('--marker-color', color);
  return marker;
};

const createPopupHtml = (incident: Incident) => {
  const activeDayLabel = incident.activeDays === 1 ? 'day' : 'days';

  return `
    <strong>${escapeHtml(incident.commonName)}</strong><br />
    ${escapeHtml(incident.locationName)}<br />
    <small>Active ${escapeHtml(incident.activeDays)} ${activeDayLabel} (${escapeHtml(incident.sightingCount)} reports)</small>
  `;
};

const enableTerrainIfAvailable = (map: Map) => {
  for (const sourceId of TERRAIN_SOURCE_IDS) {
    if (map.getSource(sourceId)) {
      map.setTerrain({ source: sourceId, exaggeration: 0.35 });
      return;
    }
  }
};

export const SightingMap = ({ incidents }: SightingMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const styleUrl = buildMaptilerStyleUrl();

  useEffect(() => {
    if (!containerRef.current || !styleUrl) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.once('load', () => enableTerrainIfAvailable(map));

    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = incidents.map((incident) => {
      const rarity = getIncidentRarity(incident);
      const color = getRarityColor(rarity);
      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(createPopupHtml(incident));

      return new maplibregl.Marker({
        element: createMarkerElement(color),
        anchor: 'bottom',
      })
        .setLngLat([incident.centroidLng, incident.centroidLat])
        .setPopup(popup)
        .addTo(map);
    });
  }, [incidents]);

  if (!styleUrl) {
    return (
      <div className="map-wrapper sighting-map-config" style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
        Add <code>VITE_MAPTILER_STYLE_URL</code> and <code>VITE_MAPTILER_API_KEY</code> to render the MapTiler map.
      </div>
    );
  }

  return (
    <div className="map-wrapper" style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
      <div ref={containerRef} className="sighting-map" data-testid="map-container" />
    </div>
  );
};
