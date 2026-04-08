import { describe, it, expect } from 'vitest';
import { getRarityColor, RARITY_COLOR_MAP } from './rarity-utils';

describe('rarity-utils', () => {
  it('should return the correct color for a given rarity code', () => {
    expect(getRarityColor(4)).toBe(RARITY_COLOR_MAP[4]);
    expect(getRarityColor(5)).toBe(RARITY_COLOR_MAP[5]);
  });

  it('should return the default color for an unknown rarity code', () => {
    expect(getRarityColor(99)).toBe('#9e9e9e');
  });

  it('should return the default color for 0', () => {
    expect(getRarityColor(0)).toBe('#9e9e9e');
  });
});
