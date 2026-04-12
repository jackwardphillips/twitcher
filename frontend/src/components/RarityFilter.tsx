import React from 'react';

/**
 * Valid ABA rarity codes (1-6).
 */
export type RarityCode = 1 | 2 | 3 | 4 | 5 | 6;

export interface RarityFilterProps {
  selectedRarities: RarityCode[];
  onToggleRarity: (rarity: RarityCode) => void;
}

/**
 * A filter component to select/deselect ABA rarity codes.
 * Responsive: Inline on desktop, dropdown on mobile.
 */
export const RarityFilter: React.FC<RarityFilterProps> = () => {
  return null; // Shell implementation
};
