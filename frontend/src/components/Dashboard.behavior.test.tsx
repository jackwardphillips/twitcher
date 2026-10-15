import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard.js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

describe('Dashboard Behavioral Tests', () => {
  const mockIncidents = [
    {
      id: 'incident-1',
      abaCode: 5,
      commonName: 'Rare Bird',
      scientificName: 'Rarus birdus',
      locationName: 'Secret Spot',
      centroidLat: 42,
      centroidLng: -71,
      firstSeen: '2026-05-10',
      lastSeen: '2026-05-15',
      sightingCount: 10,
      activeDays: 6,
      dailyCounts: [
        { date: '2026-05-10', count: 2 },
        { date: '2026-05-11', count: 8 }
      ],
      photo: { url: 'http://example.com/photo.jpg', attribution: 'Photo by Me' }
    },
    {
      id: 'incident-2',
      abaCode: 3,
      commonName: 'Commonish Bird',
      scientificName: 'Commonus birdus',
      locationName: 'Public Park',
      centroidLat: 42.1,
      centroidLng: -71.1,
      firstSeen: '2026-05-20',
      lastSeen: '2026-05-21',
      sightingCount: 2,
      activeDays: 2,
      dailyCounts: [],
      photo: null
    }
  ]

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/incidents')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockIncidents
        })
      }
      return Promise.reject(new Error('Unknown API'))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading state initially', async () => {
    (global.fetch as any).mockReturnValue(new Promise(() => {}))

    render(<Dashboard />)
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument()
  })

  it('shows error message on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<Dashboard />)

    const errorMsg = await screen.findByText(/Error: Failed to fetch incidents/i)
    expect(errorMsg).toBeInTheDocument()
  })

  it('shows empty state when no incidents match filters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    render(<Dashboard />)

    const emptyMsg = await screen.findByText(/No rare birds reported/i)
    expect(emptyMsg).toBeInTheDocument()
  })

  it('renders the shared header subtitle', async () => {
    render(<Dashboard />)

    await screen.findByRole('heading', { name: 'Rare Bird' })

    expect(screen.getByText(/Field notes & ABA rarities/i)).toBeInTheDocument()
    expect(screen.queryByText(/Last email ingested:/i)).not.toBeInTheDocument()
  })

  it('filters by rarity correctly (behavioral)', async () => {
    const mockIncidents = [
      { id: '1', abaCode: 1, commonName: 'Common Bird', dailyCounts: [], photo: null, firstSeen: '', lastSeen: '', centroidLat: 40, centroidLng: -75 },
      { id: '2', abaCode: 4, commonName: 'Rare Bird', dailyCounts: [], photo: null, firstSeen: '', lastSeen: '', centroidLat: 40, centroidLng: -75 }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockIncidents
    })

    render(<Dashboard />)

    await screen.findByText('Rare Bird')
    expect(screen.queryByText('Common Bird')).not.toBeInTheDocument()
  })
})
