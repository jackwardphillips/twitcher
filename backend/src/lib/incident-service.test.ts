import { describe, it, expect } from 'vitest';
import { normalizeScientificName } from './incident-service';

describe('IncidentService', () => {
  describe('normalizeScientificName', () => {
    it('should strip parenthetical qualifiers from scientific names', () => {
      expect(normalizeScientificName('Lonchura malacca (Exotic: Naturalized)')).toBe('Lonchura malacca');
      expect(normalizeScientificName('Passer domesticus (Established)')).toBe('Passer domesticus');
    });

    it('should trim whitespace', () => {
      expect(normalizeScientificName('  Lonchura malacca  ')).toBe('Lonchura malacca');
    });

    it('should handle names without parentheses', () => {
      expect(normalizeScientificName('Turdus migratorius')).toBe('Turdus migratorius');
    });

    it('should handle multiple sets of parentheses (though unlikely)', () => {
      expect(normalizeScientificName('Species name (extra) (info)')).toBe('Species name');
    });

    it('should handle empty or null-like input gracefully', () => {
      // @ts-expect-error - testing invalid input
      expect(normalizeScientificName(null)).toBe('');
      // @ts-expect-error - testing invalid input
      expect(normalizeScientificName(undefined)).toBe('');
      expect(normalizeScientificName('')).toBe('');
    });
  });
});
