import React, { useEffect, useState } from 'react';
import { SightingMap } from './SightingMap.js';
import { filterByProximity } from '../lib/geo-utils.js';

interface Sighting {
  id: number;
  species: string;
  scientificName?: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  observer: string;
  details?: string;
  mapUrl?: string;
  checklistUrl?: string;
  streak?: number;
}

const Dashboard: React.FC = () => {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Near Me Filter state
  const [nearMe, setNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
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

  const getRarityColor = (sighting: Sighting) => {
    // Determine color based on scientific name or species keywords for now
    // In a real app, this would come from a 'rarity' field in the DB.
    const species = sighting.species.toLowerCase();
    if (species.includes('stint') || species.includes('garganey') || species.includes(' McKay\'s')) return 'var(--clr-berry)'; // Very Rare
    if (species.includes('godwit') || species.includes('curlew')) return 'var(--clr-gold)'; // Uncommon
    return 'var(--clr-rust)'; // Normal Rare/Notable
  };

  const displayedSightings = (nearMe && userLocation) 
    ? filterByProximity(sightings, userLocation.lat, userLocation.lng, 50)
    : sightings;

  if (loading) return <div>Loading sightings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Rare Bird Dashboard</h1>
        <div className="controls">
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
              <p className="comments">{sighting.details}</p>
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
            No rare birds reported within 50km of your location.
          </div>
        )}
      </div>
    </div>
  );
};

export { Dashboard };
