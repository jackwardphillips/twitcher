import { render, screen } from '@testing-library/react'
import { App } from './App.js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the Dashboard and shows initial loading state', async () => {
    // Keep fetch pending
    (global.fetch as any).mockReturnValue(new Promise(() => {}));
    
    render(<App />)
    expect(screen.getByText(/twitcher/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dashboard/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /aba codes/i })).toBeInTheDocument()
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument()
  })

  it('renders the About page when the path is /about', () => {
    window.history.pushState({}, '', '/about')

    render(<App />)

    expect(screen.getByRole('heading', { name: /about aba codes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aba codes/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.queryByText(/Loading sightings.../i)).not.toBeInTheDocument()
  })
})
