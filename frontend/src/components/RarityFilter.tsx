import React from 'react';
import { RARITY_COLOR_MAP } from '../lib/rarity-utils.js';

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
 */
export const RarityFilter: React.FC<RarityFilterProps> = ({ selectedRarities, onToggleRarity }) => {
  const codes: RarityCode[] = [1, 2, 3, 4, 5, 6];

  return (
    <div 
      className="rarity-filter inline-layout" 
      role="group" 
      aria-label="Filter by Rarity"
    >
      {codes.map((code) => (
        <button
          key={code}
          onClick={() => onToggleRarity(code)}
          aria-label={code.toString()}
          className={`rarity-btn ${selectedRarities.includes(code) ? 'active' : ''} ${selectedRarities.length === 1 && selectedRarities.includes(code) ? 'last-active' : ''}`}
          style={{ '--rarity-color': RARITY_COLOR_MAP[code] } as React.CSSProperties}
        >
          <span className="ui-control-label">{code}</span>
        </button>
      ))}
    </div>
  );
};
