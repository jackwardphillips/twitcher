import React, { useEffect, useState } from 'react';
import { SightingMap } from './SightingMap.js';

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
}

const Dashboard: React.FC = () => {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div>Loading sightings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard">
      <h1>Rare Bird Dashboard</h1>
      <SightingMap sightings={sightings} />
      <div className="sightings-list">
        {sightings.map((sighting) => (
          <div key={sighting.id} className="sighting-card">
            <h3>{sighting.species}</h3>
            <p className="scientific-name">{sighting.scientificName}</p>
            <div className="sighting-details">
              <p><strong>Location:</strong> {sighting.location}</p>
              <p><strong>Date:</strong> {new Date(sighting.date).toLocaleString()}</p>
              <p><strong>Observer:</strong> {sighting.observer}</p>
            </div>
            {sighting.details && (
              <p className="comments">"{sighting.details}"</p>
            )}
            <div className="links">
              {sighting.mapUrl && <a href={sighting.mapUrl} target="_blank" rel="noopener noreferrer">Map</a>}
              {sighting.checklistUrl && <a href={sighting.checklistUrl} target="_blank" rel="noopener noreferrer">Checklist</a>}
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { Dashboard };

