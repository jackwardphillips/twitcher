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
export const RarityFilter: React.FC<RarityFilterProps> = ({ selectedRarities, onToggleRarity }) => {
  const codes: RarityCode[] = [1, 2, 3, 4, 5, 6];
  return (
    <div className="rarity-filter">
      {codes.map((code) => (
        <button
          key={code}
          onClick={() => onToggleRarity(code)}
          aria-label={code.toString()}
          className={selectedRarities.includes(code) ? 'active' : ''}
        >
          {code}
        </button>
      ))}
    </div>
  );
};
