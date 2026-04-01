import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchEngine } from './match-engine.js';
import { EbirdClient, EbirdObservation } from './ebird-client.js';

describe('MatchEngine', () => {
  let ebirdClient: EbirdClient;
  let matchEngine: MatchEngine;

  beforeEach(() => {
    ebirdClient = {
      getNotableObservations: vi.fn(),
      getNearbyNotableObservations: vi.fn(),
      getChecklist: vi.fn(),
    } as any;
    matchEngine = new MatchEngine(ebirdClient);
  });

  it('should match a sighting with an exact species and location string match', async () => {
    const emailSighting = {
      species: 'Taiga Bean-Goose',
      location: 'Deering Rd, Capital CA-BC',
      date: new Date('2026-03-29T17:00:00'),
    };

    const mockObservations: EbirdObservation[] = [{
      speciesCode: 'taibeg',
      comName: 'Taiga Bean-Goose',
      sciName: 'Anser fabalis',
      locId: 'L12345',
      locName: 'Deering Rd bridge',
      obsDt: '2026-03-29 17:00',
      lat: 48.5813,
      lng: -124.3948,
      subId: 'S314590424',
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    }];

    (ebirdClient.getNotableObservations as any).mockResolvedValue(mockObservations);

    const match = await matchEngine.findMatch(emailSighting as any);

    expect(match).toBeDefined();
    expect(match?.subId).toBe('S314590424');
    expect(match?.speciesCode).toBe('taibeg');
  });

  it('should match using fuzzy species name (partial match)', async () => {
    const emailSighting = {
      species: 'Golden-Plover',
      location: 'Victoria, CA-BC',
      date: new Date('2026-03-29T12:00:00'),
    };

    const mockObservations: EbirdObservation[] = [{
      speciesCode: 'amgplo',
      comName: 'American Golden-Plover',
      sciName: 'Pluvialis dominica',
      locId: 'L1',
      locName: 'Cattle Point',
      obsDt: '2026-03-29 11:45',
      lat: 48.4,
      lng: -123.3,
      subId: 'S1',
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    }];

    (ebirdClient.getNotableObservations as any).mockResolvedValue(mockObservations);

    const match = await matchEngine.findMatch(emailSighting as any);
    expect(match?.speciesCode).toBe('amgplo');
  });

  it('should match sightings within a 24-hour window', async () => {
    const emailSighting = {
      species: 'Rare Bird',
      location: 'Victoria, CA-BC',
      date: new Date('2026-03-29T10:00:00'),
    };

    const mockObservations: EbirdObservation[] = [{
      speciesCode: 'rare',
      comName: 'Rare Bird',
      sciName: 'Rarus birdus',
      locId: 'L1',
      locName: 'Spot',
      obsDt: '2026-03-30 08:00', // 22 hours later
      lat: 48.4,
      lng: -123.3,
      subId: 'S2',
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    }];

    (ebirdClient.getNotableObservations as any).mockResolvedValue(mockObservations);

    const match = await matchEngine.findMatch(emailSighting as any);
    expect(match?.subId).toBe('S2');
  });

  it('should match using location string similarity when multiple candidates exist', async () => {
    const emailSighting = {
      species: 'Common Bird',
      location: 'Swan Lake, CA-BC',
      date: new Date('2026-03-29T12:00:00'),
    };

    const mockObservations: EbirdObservation[] = [
      {
        speciesCode: 'combird',
        comName: 'Common Bird',
        sciName: 'C C',
        locId: 'L1',
        locName: 'Other Place',
        obsDt: '2026-03-29 12:00',
        lat: 48.4,
        lng: -123.3,
        subId: 'S1',
        obsValid: true,
        obsReviewed: true,
        locationPrivate: false,
      },
      {
        speciesCode: 'combird',
        comName: 'Common Bird',
        sciName: 'C C',
        locId: 'L2',
        locName: 'Swan Lake Nature Sanctuary',
        obsDt: '2026-03-29 12:05',
        lat: 48.4,
        lng: -123.3,
        subId: 'S2',
        obsValid: true,
        obsReviewed: true,
        locationPrivate: false,
      }
    ];

    (ebirdClient.getNotableObservations as any).mockResolvedValue(mockObservations);

    const match = await matchEngine.findMatch(emailSighting as any);
    expect(match?.subId).toBe('S2'); // S2 is closer in location name
  });


  it('should match a sighting based on coordinates parsed from the location string', async () => {
    const emailSighting = {
      species: 'Pink-footed Goose',
      location: 'Newport Rd, Corinna (44.9071,-69.2646)',
      date: new Date('2026-03-29T16:50:00'),
    };

    const mockObservations: EbirdObservation[] = [{
      speciesCode: 'pifgoo',
      comName: 'Pink-footed Goose',
      sciName: 'Anser brachyrhynchus',
      locId: 'L67890',
      locName: 'Corinna fields',
      obsDt: '2026-03-29 16:50',
      lat: 44.9071,
      lng: -69.2646,
      subId: 'S314522698',
      obsValid: true,
      obsReviewed: true,
      locationPrivate: false,
    }];

    (ebirdClient.getNearbyNotableObservations as any).mockResolvedValue(mockObservations);

    const match = await matchEngine.findMatch(emailSighting as any);

    expect(match).toBeDefined();
    expect(match?.subId).toBe('S314522698');
  });

  it('should return null if no match is found', async () => {
    const emailSighting = {
      species: 'Unicorn',
      location: 'My Backyard',
      date: new Date(),
    };

    (ebirdClient.getNotableObservations as any).mockResolvedValue([]);

    const match = await matchEngine.findMatch(emailSighting as any);

    expect(match).toBeNull();
  });
});
