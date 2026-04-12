export const RARITY_COLOR_MAP: Record<number, string> = {
  1: '#9e9e9e',
  2: '#616161',
  3: '#7a9e7e',
  4: '#c9a84c',
  5: '#6b3fa0',
  6: '#a01010',
};

export const DEFAULT_RARITY_COLOR = '#9e9e9e';

export const getRarityColor = (rarity: number): string => {
  return RARITY_COLOR_MAP[rarity] || DEFAULT_RARITY_COLOR;
};
