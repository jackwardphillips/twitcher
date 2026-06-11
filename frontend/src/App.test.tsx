import { render, screen } from '@testing-library/react'
import { App } from './App.js'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
  });

  it('renders the Dashboard and shows initial loading state', async () => {
    // Keep fetch pending
    (global.fetch as any).mockReturnValue(new Promise(() => {}));
    
    render(<App />)
    expect(screen.getByText(/twitcher/i)).toBeInTheDocument()
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument()
  })
})
