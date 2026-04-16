import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App.js'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
  });

  it('renders the twitcher header', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/twitcher/i)).toBeInTheDocument()
    });
  })
})
