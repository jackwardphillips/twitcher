import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './lib/db';

describe('Database Integration (Clean)', () => {
  // Global setup should handle cleaning now
  
  it('should insert a sighting', async () => {
    await db.sighting.create({
      data: {
        species: 'Test Bird',
        location: 'Test Location',
        date: new Date(),
        observer: 'Test Observer',
        rarity: 1,
      }
    });
    
    const count = await db.sighting.count();
    expect(count).toBe(1);
  });

  it('should start with an empty database due to global cleanup', async () => {
    const count = await db.sighting.count();
    expect(count).toBe(0);
  });
});
