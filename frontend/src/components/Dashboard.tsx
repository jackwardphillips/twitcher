import React, { useEffect, useState } from 'react'
import { SightingMap } from './SightingMap.js'
import { calculateDistance } from '../lib/geo-utils.js'
import { getRarityColor as getRarityUtilityColor } from '../lib/rarity-utils.js'
import { RarityFilter, type RarityCode } from './RarityFilter.js'
import { PhotoSlot } from './PhotoSlot.js'
import { SightingHistogram } from './SightingHistogram.js'
import { formatDayMonth } from '../lib/date-utils.js'
import { NotebookTabs, type NotebookTabKey } from './NotebookTabs.js'
import { JournalHeader } from './JournalHeader.js'

const API_URL = import.meta.env.VITE_API_URL ?? ''

const rangerStationLabels = {
  count: 'Reports',
  location: 'Map Note',
  lastSeen: 'Last Seen',
}

const shouldShowSummary = (summary?: string | null) => {
  const trimmedSummary = summary?.trim()
  return Boolean(trimmedSummary && trimmedSummary.length >= 5 && !trimmedSummary.toLowerCase().includes('no useful'))
}

export interface Incident {
  id: string
  scientificName: string
  commonName: string
  abaCode: number | null
  centroidLat: number
  centroidLng: number
  locationName: string
  firstSeen: string
  lastSeen: string
  sightingCount: number
  activeDays: number
  latestMapUrl: string | null
  latestChecklistUrl: string | null
  geminiSummary?: string | null
  dailyCounts: { date: string; count: number }[]
  photo: { url: string; attribution: string } | null
}

interface DashboardProps {
  onNavigate?: (tab: NotebookTabKey) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate = () => {} }) => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Near Me Filter state
  const [nearMe, setNearMe] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Rarity Filter state
  const [selectedRarities, setSelectedRarities] = useState<RarityCode[]>([3, 4, 5, 6])

  useEffect(() => {
    // Fetch incidents
    fetch(`${API_URL}/api/incidents`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch incidents')
        return res.json()
      })
      .then((data) => {
        setIncidents(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleToggleNearMe = () => {
    if (!nearMe && !userLocation) {
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported by your browser')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setNearMe(true)
          setGeoError(null)
        },
        (err) => {
          setGeoError(`Location access denied: ${err.message}`)
          setNearMe(false)
        },
      )
    } else {
      setNearMe(!nearMe)
    }
  }

  const handleToggleRarity = (rarity: RarityCode) => {
    setSelectedRarities((prev) => {
      if (prev.includes(rarity)) {
        // Empty-state guard: cannot deselect last code
        if (prev.length === 1) return prev
        return prev.filter((r) => r !== rarity)
      } else {
        return [...prev, rarity].sort()
      }
    })
  }

  const getRarityColor = (incident: Incident) => {
    // Fallback for missing abaCode to code 5
    const rarity = incident.abaCode === null || incident.abaCode === 0 ? 5 : incident.abaCode
    return getRarityUtilityColor(rarity as RarityCode)
  }

  const displayedIncidents = incidents
    .filter((incident): incident is Incident & { abaCode: RarityCode } => {
      // Fallback for missing abaCode to code 5
      const rarity = (incident.abaCode === null || incident.abaCode === 0 ? 5 : incident.abaCode) as RarityCode
      return selectedRarities.includes(rarity)
    })
    .filter((incident) => {
      if (!nearMe || !userLocation) return true
      const dist = calculateDistance(userLocation.lat, userLocation.lng, incident.centroidLat, incident.centroidLng)
      return dist <= 50
    })

  const layoutIncidents = displayedIncidents
    .map((incident, index) => ({
      incident,
      hasSummary: shouldShowSummary(incident.geminiSummary),
      index,
    }))
    .sort((a, b) => {
      if (a.hasSummary !== b.hasSummary) {
        return Number(b.hasSummary) - Number(a.hasSummary)
      }

      return a.index - b.index
    })
    .map(({ incident }) => incident)

  return (
    <div className="dashboard" data-theme="ranger-station" data-preview="minimal-header">
      <div className="notebook-top-shell">
        <NotebookTabs activeTab="dashboard" onNavigate={onNavigate} />

        <JournalHeader
          controls={
            <>
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
            </>
          }
        />
      </div>

      {loading ? (
        <div className="loading-state">Loading sightings...</div>
      ) : error ? (
        <div className="error-state">Error: {error}</div>
      ) : (
        <>
          <SightingMap incidents={displayedIncidents} />

          <div className="sightings-list">
            {layoutIncidents.map((incident) => (
              <div
                key={incident.id}
                className="sighting-card sighting-card-horizontal"
                style={{
                  borderLeftColor: getRarityColor(incident),
                  '--rarity-color': getRarityColor(incident),
                } as React.CSSProperties}
              >
                <PhotoSlot photo={incident.photo} />

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
                        <p className="location-info"><span className="sr-only">{rangerStationLabels.location}: </span>{incident.locationName}</p>
                      </div>
                    </div>
                  </div>

                  {shouldShowSummary(incident.geminiSummary) && (
                    <blockquote
                      className="gemini-summary"
                      style={{ borderLeftColor: getRarityColor(incident) }}
                    >
                      {incident.geminiSummary}
                    </blockquote>
                  )}

                  <div className="card-middle-row">
                    <div className="stat-item">
                      <span className="stat-label">{rangerStationLabels.count}</span>
                      <span className="stat-value">{incident.sightingCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">First Seen</span>
                      <span className="stat-value">{formatDayMonth(incident.firstSeen)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{rangerStationLabels.lastSeen}</span>
                      <span className="stat-value">{formatDayMonth(incident.lastSeen)}</span>
                    </div>
                    <div className="stat-item activity-stat">
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
        </>
      )}
    </div>
  )
}

export { Dashboard }
