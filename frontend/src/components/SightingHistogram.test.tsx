import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SightingHistogram } from './SightingHistogram';

describe('SightingHistogram', () => {
  const dailyCounts = [
    { date: '2026-04-10', count: 2 },
    { date: '2026-04-11', count: 5 },
    { date: '2026-04-12', count: 0 },
  ];

  it('renders correctly', () => {
    render(<SightingHistogram dailyCounts={dailyCounts} rarityColor="#ff0000" />);
    const bars = screen.getAllByTestId('histogram-bar');
    expect(bars.length).toBe(3);
  });

  it('shows tooltip with date and count on hover', async () => {
    render(<SightingHistogram dailyCounts={dailyCounts} rarityColor="#ff0000" />);
    
    const bar = screen.getAllByTestId('histogram-bar')[1]; // The one with count 5
    fireEvent.mouseEnter(bar);
    
    // CRITICAL: Assert tooltip content is present in DOM
    const tooltip = await screen.findByTestId('histogram-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Apr 10');
    expect(tooltip).toHaveTextContent('5 sightings');
  });
});
