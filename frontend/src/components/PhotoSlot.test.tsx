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
    const photo = { url: 'test.jpg', attribution: 'Photo by Test' };
    render(<PhotoSlot photo={photo} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'test.jpg');
    expect(screen.getByText('Photo by Test')).toBeInTheDocument();
  });
});
