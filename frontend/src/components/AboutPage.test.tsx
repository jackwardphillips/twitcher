import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AboutPage } from './AboutPage.js'

describe('AboutPage', () => {
  it('updates the sample card bird when the rarity changes', () => {
    render(<AboutPage />)

    expect(screen.getByRole('heading', { name: /yellow-headed caracara/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://inaturalist-open-data.s3.amazonaws.com/photos/593263749/medium.jpg')

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByRole('heading', { name: /american robin/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://inaturalist-open-data.s3.amazonaws.com/photos/190120595/medium.jpeg')

    fireEvent.click(screen.getByRole('button', { name: '6' }))
    expect(screen.getByRole('heading', { name: /ivory-billed woodpecker/i })).toBeInTheDocument()
    expect(screen.getByAltText(/sighting photo/i)).toHaveAttribute('src', 'https://inaturalist-open-data.s3.amazonaws.com/photos/463200402/medium.jpg')
  })

  it('uses only open-license iNaturalist photos with observation links', () => {
    const { container } = render(<AboutPage />)

    for (const rarity of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: rarity }))

      const image = screen.getByAltText(/sighting photo/i)
      expect(image.getAttribute('src')).toMatch(
        /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\//,
      )

      const attribution = container.querySelector<HTMLAnchorElement>(
        '.photo-slot .attribution-overlay',
      )
      expect(attribution).toHaveAttribute(
        'href',
        expect.stringMatching(/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/),
      )
      expect(attribution).not.toHaveTextContent(/CC BY-NC|all rights reserved/i)
    }
  })
})
