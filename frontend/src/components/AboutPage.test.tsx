import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AboutPage } from './AboutPage.js'

describe('AboutPage', () => {
  it('updates the sample card bird when the rarity changes', () => {
    render(<AboutPage />)

    expect(screen.getByRole('heading', { name: /yellow-headed caracara/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://static.inaturalist.org/photos/79568634/medium.jpeg')

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByRole('heading', { name: /american robin/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://inaturalist-open-data.s3.amazonaws.com/photos/34859026/medium.jpg')

    fireEvent.click(screen.getByRole('button', { name: '6' }))
    expect(screen.getByRole('heading', { name: /ivory-billed woodpecker/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://inaturalist-open-data.s3.amazonaws.com/photos/430795661/medium.jpeg')
  })
})
