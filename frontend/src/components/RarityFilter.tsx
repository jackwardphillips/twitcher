import React from 'react';
import { getRarityColor } from '../lib/rarity-utils.js';

/**
 * Valid ABA rarity codes (1-6).
 */
export type RarityCode = 1 | 2 | 3 | 4 | 5 | 6;

export type RaritySelection = RarityCode | 'unknown';

export interface RarityFilterProps {
  selectedRarities: RaritySelection[];
  includeUnknown?: boolean;
  onToggleRarity: (rarity: RaritySelection) => void;
}

/**
 * A filter component to select/deselect ABA rarity codes.
 */
export const RarityFilter: React.FC<RarityFilterProps> = ({ selectedRarities, onToggleRarity, includeUnknown = true }) => {
  const codes: RaritySelection[] = [1, 2, 3, 4, 5, 6, ...(includeUnknown ? ['unknown' as const] : [])];

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
          aria-label={code === 'unknown' ? 'Unknown rarity' : code.toString()}
          className={`rarity-btn ${code === 'unknown' ? 'rarity-btn-unknown' : ''} ${selectedRarities.includes(code) ? 'active' : ''} ${selectedRarities.length === 1 && selectedRarities.includes(code) ? 'last-active' : ''}`}
          style={{ '--rarity-color': getRarityColor(code === 'unknown' ? null : code) } as React.CSSProperties}
        >
          <span className="ui-control-label">{code === 'unknown' ? 'Unknown' : code}</span>
        </button>
      ))}
    </div>
  );
};
