import React, { useEffect, useState } from 'react';
import { SightingMap } from './SightingMap.js';
import { calculateDistance } from '../lib/geo-utils.js';
import { getRarityColor as getRarityUtilityColor } from '../lib/rarity-utils.js';
import { RarityFilter, type RarityCode } from './RarityFilter.js';
import { PhotoSlot } from './PhotoSlot.js';
import { SightingHistogram } from './SightingHistogram.js';

// ... (keep types and state definitions)
export interface Incident {
  id: string;
  scientificName: string;
  commonName: string;
  abaCode: number | null;
  centroidLat: number;
  centroidLng: number;
  locationName: string;
  firstSeen: string;
  lastSeen: string;
  sightingCount: number;
  activeDays: number;
  latestMapUrl: string | null;
  latestChecklistUrl: string | null;
  geminiSummary?: string | null;
  dailyCounts: { date: string; count: number }[];
  photo: { url: string; attribution: string } | null;
}
// ...

interface IngestionStatus {
  lastIngestedEmailDate: string | null;
  lastRun: {
    status: 'success' | 'no_new_emails' | 'imap_error';
    error?: string;
    ingested: number;
  } | null;
}

const Dashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus | null>(null);
  
  // Near Me Filter state
  const [nearMe, setNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Rarity Filter state
  const [selectedRarities, setSelectedRarities] = useState<RarityCode[]>([3, 4, 5, 6]);

  useEffect(() => {
    // Fetch incidents
    fetch('/api/incidents')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch incidents');
        return res.json();
      })
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch ingestion status
    fetch('/api/ingestion-status')
      .then((res) => res.json())
      .then((data) => setIngestionStatus(data))
      .catch((err) => console.error('Failed to fetch ingestion status:', err));
  }, []);

  const handleToggleNearMe = () => {
    if (!nearMe && !userLocation) {
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setNearMe(true);
          setGeoError(null);
        },
        (err) => {
          setGeoError(`Location access denied: ${err.message}`);
          setNearMe(false);
        }
      );
    } else {
      setNearMe(!nearMe);
    }
  };

  const handleToggleRarity = (rarity: RarityCode) => {
    setSelectedRarities((prev) => {
      if (prev.includes(rarity)) {
        // Empty-state guard: cannot deselect last code
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== rarity);
      } else {
        return [...prev, rarity].sort();
      }
    });
  };

  const getRarityColor = (incident: Incident) => {
    // Fallback for missing abaCode to code 5
    const rarity = (incident.abaCode === null || incident.abaCode === 0) ? 5 : incident.abaCode;
    return getRarityUtilityColor(rarity as RarityCode);
  };

  const displayedIncidents = incidents
    .filter((incident): incident is Incident & { abaCode: RarityCode } => {
      // Fallback for missing abaCode to code 5
      const rarity = (incident.abaCode === null || incident.abaCode === 0 ? 5 : incident.abaCode) as RarityCode;
      return selectedRarities.includes(rarity);
    })
    .filter((incident) => {
      if (!nearMe || !userLocation) return true;
      const dist = calculateDistance(userLocation.lat, userLocation.lng, incident.centroidLat, incident.centroidLng);
      return dist <= 50;
    });

  if (loading) return <div>Loading sightings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-main">
          <h1>twitcher</h1>
          {ingestionStatus?.lastIngestedEmailDate && (
            <div className="ingestion-status">
              <span className="status-label">Last email ingested:</span>
              <span className="status-value">
                {new Date(ingestionStatus.lastIngestedEmailDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {ingestionStatus.lastRun?.status === 'imap_error' && (
                <span className="ingestion-error" title={ingestionStatus.lastRun.error}>
                   ⚠️ Connection Issue
                </span>
              )}
            </div>
          )}
        </div>
        <div className="controls">
          <RarityFilter 
            selectedRarities={selectedRarities} 
            onToggleRarity={handleToggleRarity} 
          />
          <button 
            className={`filter-btn ${nearMe ? 'active' : ''}`}
            onClick={handleToggleNearMe}
          >
            {nearMe ? 'Showing Near Me (50km)' : 'Filter Near Me'}
          </button>
          {geoError && <span className="geo-error">{geoError}</span>}
        </div>
      </header>

      <SightingMap incidents={displayedIncidents} />
      
      <div className="sightings-list">
        {displayedIncidents.map((incident) => (
          <div 
            key={incident.id} 
            className="sighting-card sighting-card-horizontal"
            style={{ borderLeftColor: getRarityColor(incident) }}
          >
            <div className="photo-slot">
              <PhotoSlot photo={incident.photo} />
            </div>
            
            <div className="card-content">
              <div className="card-top-row">
                <div className="species-info">
                  <h3>{incident.commonName}</h3>
                  <p className="scientific-name">{incident.scientificName}</p>
                  <div className="location-container">
                    <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <p className="location-info">{incident.locationName}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <span 
                    className="streak-badge"
                    style={{ 
                      '--rarity-color': getRarityColor(incident) 
                    } as React.CSSProperties}
                  >
                    Active {incident.activeDays} {incident.activeDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>

              {incident.geminiSummary && (
                <blockquote 
                  className="gemini-summary"
                  style={{ borderLeftColor: getRarityColor(incident) }}
                >
                  {incident.geminiSummary}
                </blockquote>
              )}

              <div className="card-middle-row">
                <div className="stat-item">
                  <span className="stat-label">Reports</span>
                  <span className="stat-value">{incident.sightingCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">First Seen</span>
                  <span className="stat-value">{new Date(incident.firstSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Seen</span>
                  <span className="stat-value">{new Date(incident.lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="stat-item" style={{ marginLeft: 'auto', width: '240px' }}>
                  <SightingHistogram 
                    dailyCounts={incident.dailyCounts} 
                    rarityColor={getRarityColor(incident)} 
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        {displayedIncidents.length === 0 && (
          <div className="no-results">
            {nearMe ? 'No rare birds reported within 50km of your location.' : 'No rare birds reported.'}
          </div>
        )}
      </div>
    </div>
  );
};

export { Dashboard };
