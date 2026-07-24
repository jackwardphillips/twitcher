import { render, screen } from '@testing-library/react'
import { App } from './App.js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

describe('Dashboard component flow', () => {
  const mockIncidents = [
    {
      id: 'i1',
      abaCode: 4,
      commonName: 'Smoke Bird',
      scientificName: 'Smokus birdus',
      locationName: 'Test Field',
      centroidLat: 45, centroidLng: -90,
      firstSeen: '2026-05-10', lastSeen: '2026-05-15',
      sightingCount: 5, activeDays: 6,
      dailyCounts: [], photo: null
    }
  ]

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/incidents')) {
        return Promise.resolve({ ok: true, json: async () => mockIncidents })
      }
      if (url.endsWith('/api/ingest')) {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'Ingestion complete' }) })
      }
      return Promise.reject(new Error('Unknown API'))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('performs full flow: fetch, render, and show shared header', async () => {
    render(<App />)

    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument()

    await screen.findByRole('heading', { name: 'Smoke Bird' })

    expect(screen.getAllByText('Test Field')).not.toHaveLength(0)
    expect(screen.getAllByText(/Active 6 days/i)).not.toHaveLength(0)

    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(await screen.findByTestId('marker')).toBeInTheDocument()

    expect(screen.getByText(/Field notes & ABA rarities/i)).toBeInTheDocument()
    expect(screen.queryByText(/Last email ingested:/i)).not.toBeInTheDocument()
  })

  it('keeps the minimal header when ingestion status is unavailable', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.endsWith('/api/incidents')) {
        return Promise.resolve({ ok: true, json: async () => mockIncidents })
      }
      return Promise.reject(new Error('Unknown API'))
    })

    render(<App />)

    await screen.findByRole('heading', { name: 'Smoke Bird' })

    expect(screen.getByText(/Field notes & ABA rarities/i)).toBeInTheDocument()
    expect(screen.queryByText(/Last email ingested:/i)).not.toBeInTheDocument()
  })
})
