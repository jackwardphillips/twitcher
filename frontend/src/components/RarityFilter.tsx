import React, { useState, useEffect } from 'react';
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
 * Responsive: Inline on desktop, dropdown on mobile.
 */
export const RarityFilter: React.FC<RarityFilterProps> = ({ selectedRarities, onToggleRarity }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const codes: RarityCode[] = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="rarity-filter-mobile">
        <div className="custom-dropdown">
          <button className="dropdown-trigger" aria-haspopup="listbox" aria-label="Select Rarities">
            Rarities ({selectedRarities.length})
          </button>
          <ul className="dropdown-menu" role="listbox">
            {codes.map((code) => (
              <li key={code} role="option" aria-selected={selectedRarities.includes(code)}>
                <button
                  onClick={() => onToggleRarity(code)}
                  className={`rarity-option ${selectedRarities.includes(code) ? 'active' : ''} ${selectedRarities.length === 1 && selectedRarities.includes(code) ? 'last-active' : ''}`}
                  style={{ '--rarity-color': RARITY_COLOR_MAP[code] } as React.CSSProperties}
                  aria-label={code.toString()}
                >
                  Code {code}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

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
          {code}
        </button>
      ))}
    </div>
  );
};
