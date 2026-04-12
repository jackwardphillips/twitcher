import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RarityFilter, type RarityCode } from './RarityFilter.js';

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

  it('highlights selected rarities', () => {
    render(<RarityFilter selectedRarities={selectedRarities} onToggleRarity={mockOnToggle} />);
    
    const btn3 = screen.getByLabelText('3');
    const btn1 = screen.getByLabelText('1');
    
    expect(btn3).toHaveClass('active');
    expect(btn1).not.toHaveClass('active');
  });
});
