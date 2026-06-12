import { useEffect, useRef } from 'react';
import maplibregl, { type Map, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDayMonth } from '../lib/date-utils.js';
import { getRarityColor } from '../lib/rarity-utils.js';
import { type Incident } from './Dashboard.js';

interface SightingMapProps {
  incidents: Incident[];
}

const DEFAULT_CENTER: [number, number] = [-95, 45];
const DEFAULT_ZOOM = 3;
const MAP_PITCH = 0;
const MAP_BEARING = 0;
const TERRAIN_SOURCE_IDS = ['terrain', 'maptiler-terrain'];
const FIELD_JOURNAL_COLORS = {
  background: '#d8c7a4',
  land: '#d3c29d',
  park: '#b9bd8e',
  water: '#b9c4b4',
  road: '#c3ad82',
  boundary: '#9f8762',
  text: '#5e513c',
  textHalo: '#efe5d0',
};

const layerMatches = (layerName: string, terms: string[]) => {
  return terms.some((term) => layerName.includes(term));
};

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
  marker.innerHTML = `
    <svg viewBox="0 0 28 31" aria-hidden="true" focusable="false">
      <path class="sighting-map-marker-halo" d="M14 29C14 29 3.5 20.3 3.5 13A10.5 10.5 0 0 1 24.5 13C24.5 20.3 14 29 14 29Z" />
      <path class="sighting-map-marker-body" d="M14 27.6C14 27.6 5.5 19.8 5.5 13A8.5 8.5 0 0 1 22.5 13C22.5 19.8 14 27.6 14 27.6Z" />
      <path class="sighting-map-marker-accent" d="M14 24.5C14 24.5 7.5 18.4 7.5 13.1A6.5 6.5 0 0 1 20.5 13.1C20.5 18.4 14 24.5 14 24.5Z" />
      <circle class="sighting-map-marker-dot" cx="14" cy="13" r="2.4" />
    </svg>
  `;
  return marker;
};

const createPopupHtml = (incident: Incident, color: string) => {
  const activeDayLabel = incident.activeDays === 1 ? 'day' : 'days';
  const firstSeen = formatDayMonth(incident.firstSeen.slice(0, 10));
  const lastSeen = formatDayMonth(incident.lastSeen.slice(0, 10));

  return `
    <article class="sighting-map-popup" style="--marker-color: ${escapeHtml(color)}">
      <div class="sighting-map-popup-top">
        <h3>${escapeHtml(incident.commonName)}</h3>
        <span class="sighting-map-popup-streak">Active ${escapeHtml(incident.activeDays)} ${activeDayLabel}</span>
      </div>
      <div class="sighting-map-popup-location">
        <svg class="sighting-map-popup-location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <p>${escapeHtml(incident.locationName)}</p>
      </div>
      <div class="sighting-map-popup-stats">
        <div class="sighting-map-popup-stat">
          <span class="sighting-map-popup-stat-label">Reports</span>
          <span class="sighting-map-popup-stat-value">${escapeHtml(incident.sightingCount)}</span>
        </div>
        <div class="sighting-map-popup-stat">
          <span class="sighting-map-popup-stat-label">First Seen</span>
          <span class="sighting-map-popup-stat-value">${escapeHtml(firstSeen)}</span>
        </div>
        <div class="sighting-map-popup-stat">
          <span class="sighting-map-popup-stat-label">Last Seen</span>
          <span class="sighting-map-popup-stat-value">${escapeHtml(lastSeen)}</span>
        </div>
      </div>
    </article>
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

const setPaintProperty = (map: Map, layerId: string, property: string, value: string) => {
  try {
    map.setPaintProperty(layerId, property, value);
  } catch {
    // Some MapTiler layers use expressions or source-specific paint properties.
  }
};

const applyFieldJournalMapColors = (map: Map) => {
  if (typeof map.getStyle !== 'function') return;

  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    const layerName = `${layer.id} ${'source-layer' in layer ? layer['source-layer'] : ''}`.toLowerCase();

    if (layer.type === 'background') {
      setPaintProperty(map, layer.id, 'background-color', FIELD_JOURNAL_COLORS.background);
    }

    if (layer.type === 'fill') {
      if (layerMatches(layerName, ['water', 'lake', 'river', 'ocean'])) {
        setPaintProperty(map, layer.id, 'fill-color', FIELD_JOURNAL_COLORS.water);
      } else if (layerMatches(layerName, ['park', 'wood', 'forest', 'grass', 'landcover', 'landuse'])) {
        setPaintProperty(map, layer.id, 'fill-color', FIELD_JOURNAL_COLORS.park);
      } else if (layerMatches(layerName, ['land', 'earth', 'background'])) {
        setPaintProperty(map, layer.id, 'fill-color', FIELD_JOURNAL_COLORS.land);
      }
    }

    if (layer.type === 'line') {
      if (layerMatches(layerName, ['road', 'path', 'trail'])) {
        setPaintProperty(map, layer.id, 'line-color', FIELD_JOURNAL_COLORS.road);
      } else if (layerMatches(layerName, ['boundary', 'border', 'admin'])) {
        setPaintProperty(map, layer.id, 'line-color', FIELD_JOURNAL_COLORS.boundary);
      } else if (layerMatches(layerName, ['water', 'river', 'stream'])) {
        setPaintProperty(map, layer.id, 'line-color', FIELD_JOURNAL_COLORS.water);
      }
    }

    if (layer.type === 'symbol') {
      setPaintProperty(map, layer.id, 'text-color', FIELD_JOURNAL_COLORS.text);
      setPaintProperty(map, layer.id, 'text-halo-color', FIELD_JOURNAL_COLORS.textHalo);
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
    map.once('load', () => {
      applyFieldJournalMapColors(map);
      enableTerrainIfAvailable(map);
    });

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
      const popup = new maplibregl.Popup({ closeButton: false, maxWidth: '420px', offset: 18 }).setHTML(createPopupHtml(incident, color));

      return new maplibregl.Marker({
        element: createMarkerElement(color),
        anchor: 'bottom',
        offset: [0, 0],
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
