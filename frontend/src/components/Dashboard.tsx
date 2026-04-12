import React, { useEffect, useState } from 'react';
import { SightingMap } from './SightingMap.js';
import { filterByProximity } from '../lib/geo-utils.js';
import { getRarityColor as getRarityUtilityColor } from '../lib/rarity-utils.js';
import { RarityFilter, RarityCode } from './RarityFilter.js';

interface Sighting {
  id: number;
  species: string;
  scientificName?: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  observer: string;
  rarity: number;
  details?: string;
  mapUrl?: string;
  checklistUrl?: string;
  streak?: number;
}

interface IngestionStatus {
  lastIngestedEmailDate: string | null;
  lastRun: {
    status: 'success' | 'no_new_emails' | 'imap_error';
    error?: string;
    ingested: number;
  } | null;
}

const Dashboard: React.FC = () => {
  const [sightings, setSightings] = useState<Sighting[]>([]);
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
    // Fetch sightings
    fetch('/api/sightings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch sightings');
        return res.json();
      })
      .then((data) => {
        setSightings(data);
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

  const getRarityColor = (sighting: Sighting) => {
    // If rarity is 0 or not found in map, default to code 5 color
    const rarity = sighting.rarity === 0 ? 5 : sighting.rarity;
    return getRarityUtilityColor(rarity);
  };

  const displayedSightings = sightings
    .filter((s) => selectedRarities.includes((s.rarity === 0 ? 5 : s.rarity) as RarityCode))
    .filter((s) => {
      if (!nearMe || !userLocation) return true;
      return filterByProximity([s], userLocation.lat, userLocation.lng, 50).length > 0;
    });

  if (loading) return <div>Loading sightings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-main">
          <h1>Rare Bird Dashboard</h1>
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

      <SightingMap sightings={displayedSightings} />
      
      <div className="sightings-list">
        {displayedSightings.map((sighting) => (
          <div 
            key={sighting.id} 
            className="sighting-card"
            style={{ borderLeftColor: getRarityColor(sighting) }}
          >
            <div className="card-header">
              {sighting.streak && sighting.streak > 1 && (
                <span className="streak-badge">Seen {sighting.streak} days in a row</span>
              )}
              <h3>{sighting.species}</h3>
              <p className="scientific-name">{sighting.scientificName}</p>
            </div>
            
            <div className="sighting-details">
              <p><strong>Location:</strong> {sighting.location}</p>
              <p><strong>Date:</strong> {new Date(sighting.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <p><strong>Observer:</strong> {sighting.observer}</p>
            </div>
            
            {sighting.details && (
              <p className="comments" style={{ borderLeftColor: getRarityColor(sighting) }}>{sighting.details}</p>
              )}
            
            <div className="links">
              {sighting.mapUrl && <a href={sighting.mapUrl} target="_blank" rel="noopener noreferrer">eBird Map</a>}
              {sighting.checklistUrl && <a href={sighting.checklistUrl} target="_blank" rel="noopener noreferrer">Checklist</a>}
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discuss</a>
            </div>
          </div>
        ))}
        {displayedSightings.length === 0 && (
          <div className="no-results">
            {nearMe ? 'No rare birds reported within 50km of your location.' : 'No rare birds reported.'}
          </div>
        )}
      </div>
    </div>
  );
};

export { Dashboard };
