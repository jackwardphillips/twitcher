import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RarityFilter, type RarityCode } from './RarityFilter.js';
import { RARITY_COLOR_MAP } from '../lib/rarity-utils.js';

describe('RarityFilter', () => {
  const mockOnToggle = vi.fn();
  const selectedRarities: RarityCode[] = [3, 4, 5, 6];

  it('renders all rarity codes 1-6', () => {
    render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
    
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it('calls onToggleRarity when a code is clicked', () => {
    render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
    
    fireEvent.click(screen.getByText('1'));
    expect(mockOnToggle).toHaveBeenCalledWith(1);
  });

  it('highlights selected rarities with correct active class', () => {
    render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
    
    const btn3 = screen.getByLabelText('3');
    const btn1 = screen.getByLabelText('1');
    
    expect(btn3).toHaveClass('active');
    expect(btn1).not.toHaveClass('active');
  });

  it('applies correct rarity colors from RARITY_COLOR_MAP', () => {
    render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
    
    for (let i = 1; i <= 6; i++) {
      const btn = screen.getByLabelText(i.toString());
      // Note: style testing can be tricky with Vitest/JSDOM, 
      // but we can check the inline style attribute if applied that way.
      // If using CSS classes, we'd check those.
      // The spec says: "each toggle styled with its rarity color"
      expect(btn).toHaveStyle({ '--rarity-color': RARITY_COLOR_MAP[i] });
    }
  });

  describe('Empty-state guard UI', () => {
    it('disables or prevents de-selection of the last active rarity code', () => {
      const onlyOneSelected: RarityCode[] = [3];
      render(<RarityFilter selectedRarities={onlyOneSelected} onToggleRarity={mockOnToggle} />);
      
      const btn3 = screen.getByLabelText('3');
      // If we implement it as 'disabled' attribute or just ignore the click.
      // Let's assume we add a 'last-active' class or similar for styling.
      expect(btn3).toHaveClass('last-active');
    });
  });

  describe('Responsive Layout', () => {
    it('renders inline buttons by default (Desktop)', () => {
      render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
      const filterContainer = screen.getByRole('group', { name: /filter by rarity/i });
      expect(filterContainer).toHaveClass('inline-layout');
    });

    it('renders a dropdown on small viewports (Mobile)', () => {
      // Mock window.innerWidth
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));
      
      render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
      
      // Look for dropdown element (e.g., a select or a custom dropdown trigger)
      expect(screen.getByLabelText(/select rarities/i)).toBeInTheDocument();
    });
  });
});
