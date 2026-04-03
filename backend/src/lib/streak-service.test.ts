import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateStreak } from './streak-service.js';
import { prisma } from './db.js';

vi.mock('./db.js', () => ({
  prisma: {
    sighting: {
      findMany: vi.fn(),
    },
  },
}));

describe('Streak Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates a 1-day streak for a single sighting', async () => {
    const sightings = [
      { date: new Date('2026-04-01T12:00:00Z') },
    ];
    vi.mocked(prisma.sighting.findMany).mockResolvedValue(sightings as any);

    const streak = await calculateStreak('Species A', 'Loc A', new Date('2026-04-01T15:00:00Z'));
    expect(streak).toBe(1);
  });

  it('calculates a multi-day streak correctly', async () => {
    // Sighting on April 3, 2, 1
    const sightings = [
      { date: new Date('2026-04-03T10:00:00Z') },
      { date: new Date('2026-04-02T15:00:00Z') },
      { date: new Date('2026-04-01T08:00:00Z') },
    ];
    vi.mocked(prisma.sighting.findMany).mockResolvedValue(sightings as any);

    const streak = await calculateStreak('Species A', 'Loc A', new Date('2026-04-03T12:00:00Z'));
    expect(streak).toBe(3);
  });

  it('breaks the streak if a day is skipped', async () => {
    // Sighting on April 5, 4, but skips 3, then April 2
    const sightings = [
      { date: new Date('2026-04-05T10:00:00Z') },
      { date: new Date('2026-04-04T15:00:00Z') },
      { date: new Date('2026-04-02T08:00:00Z') },
    ];
    vi.mocked(prisma.sighting.findMany).mockResolvedValue(sightings as any);

    const streak = await calculateStreak('Species A', 'Loc A', new Date('2026-04-05T12:00:00Z'));
    expect(streak).toBe(2);
  });

  it('handles multiple sightings on the same day as part of the same streak', async () => {
    // Sighting on April 2 (twice), April 1
    const sightings = [
      { date: new Date('2026-04-02T10:00:00Z') },
      { date: new Date('2026-04-02T15:00:00Z') },
      { date: new Date('2026-04-01T08:00:00Z') },
    ];
    vi.mocked(prisma.sighting.findMany).mockResolvedValue(sightings as any);

    const streak = await calculateStreak('Species A', 'Loc A', new Date('2026-04-02T12:00:00Z'));
    expect(streak).toBe(2);
  });
});
