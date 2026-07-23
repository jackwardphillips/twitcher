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
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByText(/Loading sightings.../i)).toBeInTheDocument()
  })

  it('renders the About page when the path is /about', () => {
    window.history.pushState({}, '', '/about')

    render(<App />)

    expect(screen.getByRole('heading', { name: /about the aba/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /about the project/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /about the cards/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /yellow-headed caracara/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.queryByText(/Loading sightings.../i)).not.toBeInTheDocument()
  })

  it('renders the Statistics page when the path is /statistics', () => {
    window.history.pushState({}, '', '/statistics')

    render(<App />)

    expect(screen.getByRole('heading', { name: /states with the most rarities/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /statistics/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.queryByText(/Loading sightings.../i)).not.toBeInTheDocument()
  })
})
