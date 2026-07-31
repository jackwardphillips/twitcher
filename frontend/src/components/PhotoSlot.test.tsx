import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PhotoSlot } from './PhotoSlot';

describe('PhotoSlot', () => {
  it('renders a placeholder when no photo is provided', () => {
    render(<PhotoSlot photo={null} />);
    const container = screen.getByTestId('photo-slot');
    expect(container).toBeInTheDocument();
  });

  it('renders the image when provided', () => {
    const photo = {
      url: 'test.jpg',
      attribution: 'Photo by Test',
      sourceUrl: 'https://www.inaturalist.org/observations/123',
    };
    render(<PhotoSlot photo={photo} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'test.jpg');
    expect(screen.getByRole('link', { name: 'Photo by Test' })).toHaveAttribute(
      'href',
      'https://www.inaturalist.org/observations/123',
    );
  });
});
