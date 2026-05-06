import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { ImapClient } from './lib/imap-client.js';
import { prisma } from './lib/db.js';
import { addSightingToIncident } from './lib/incident-service.js';
import { IncidentStatus } from '@prisma/client';
import { runSummarizationCycle } from './lib/summarization-service.js';
import { PhotoService } from './lib/photo-service.js';

vi.mock('./lib/imap-client.js');

// Mock fetch for summarization and photo tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Ingestion Concurrency', () => {
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.sighting.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.incomingEmail.deleteMany();
    await prisma.speciesPhoto.deleteMany();

    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    vi.mocked(ImapClient).mockImplementation(function() {
      return mockImapClient;
    });

    // Default fetch mock
    mockFetch.mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test summary' } }],
          results: [{
            default_photo: {
              medium_url: 'http://inat.com/photo.jpg',
              attribution: '(c) John Doe'
            }
          }]
        })
      };
    });
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('should not fan out duplicate photo fetches for the same species', async () => {
    const photoService = new PhotoService();
    const species = 'Grus grus';

    // Mock fetch to simulate a slow API response
    mockFetch.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        ok: true,
        json: async () => ({
          results: [{
            default_photo: {
              medium_url: 'http://inat.com/photo.jpg',
              attribution: '(c) John Doe'
            }
          }]
        })
      };
    });

    // Trigger two photo fetches concurrently
    await Promise.all([
      photoService.fetchSpeciesPhoto(species),
      photoService.fetchSpeciesPhoto(species)
    ]);

    // Assert: Fetch should have been called only once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not create duplicate sightings when multiple ingestions run concurrently', async () => {
    const date = new Date();
    date.setSeconds(0, 0);
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    
    const rawBody = `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;

    const mockEmail = { 
      messageId: 'msg-concurrency-test', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody 
    };

    // Make the IMAP fetch take some time to increase chance of overlap
    mockImapClient.fetchRecentAlerts.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return [mockEmail];
    });

    // Trigger two ingestions concurrently
    await Promise.all([
      request(app).post('/api/ingest'),
      request(app).post('/api/ingest')
    ]);

    const emailCount = await prisma.incomingEmail.count();
    const sightings = await prisma.sighting.findMany();
    const sightingCount = sightings.length;
    const incidents = await prisma.incident.findMany();
    const incidentCount = incidents.length;

    expect(emailCount).toBe(1);
    expect(sightingCount).toBe(1);
    expect(incidentCount).toBe(1);
  });

  it('should not create duplicate sightings when processing the same pending email concurrently', async () => {
    const date = new Date();
    date.setSeconds(0, 0);
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    
    const rawBody = `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Pending email test"`;

    // 1. Arrange: Create a 'new' email in the DB
    await prisma.incomingEmail.create({
      data: {
        messageId: 'msg-pending-concurrency',
        subject: 'Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody,
        status: 'new'
      }
    });

    // Mock IMAP to return nothing new
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);

    // 2. Act: Trigger two ingestions concurrently
    await Promise.all([
      request(app).post('/api/ingest'),
      request(app).post('/api/ingest')
    ]);

    // 3. Assert: Should still only have 1 sighting
    const sightingCount = await prisma.sighting.count();
    expect(sightingCount).toBe(1);
  });

  it('should correctly update sightingCount under concurrent incident updates', async () => {
    // 1. Arrange: Create an incident and multiple sightings
    const incident = await prisma.incident.create({
      data: {
        scientificName: 'Gavia immer',
        commonName: 'Common Loon',
        status: IncidentStatus.OPEN,
        minLat: 45, maxLat: 45, minLng: -70, maxLng: -70,
        firstSeen: new Date('2026-05-01'),
        lastSeen: new Date('2026-05-01'),
        sightingCount: 1,
        statesCovered: '["ME"]'
      }
    });

    const sightings = await Promise.all([
      prisma.sighting.create({
        data: {
          species: 'Common Loon',
          scientificName: 'Gavia immer',
          location: 'Loc A',
          date: new Date('2026-05-02'),
          observer: 'Alice',
          latitude: 45.1,
          longitude: -70.1
        }
      }),
      prisma.sighting.create({
        data: {
          species: 'Common Loon',
          scientificName: 'Gavia immer',
          location: 'Loc B',
          date: new Date('2026-05-03'),
          observer: 'Bob',
          latitude: 45.2,
          longitude: -70.2
        }
      })
    ]);

    // 2. Act: Concurrent updates
    await Promise.all(sightings.map(s => addSightingToIncident(prisma, incident, s)));

    // 3. Assert
    const updatedIncident = await prisma.incident.findUnique({
      where: { id: incident.id }
    });

    expect(updatedIncident?.sightingCount).toBe(3); // 1 (initial) + 2 (new)
    expect(updatedIncident?.lastSeen.toISOString()).toBe(new Date('2026-05-03').toISOString());
  });

  it('should not run overlapping summarization cycles', async () => {
    // 1. Arrange: Create an incident that needs summarization
    const incident = await prisma.incident.create({
      data: {
        scientificName: 'Grus grus',
        commonName: 'Common Crane',
        status: IncidentStatus.OPEN,
        minLat: 42, maxLat: 42, minLng: -76, maxLng: -76,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sightingCount: 1,
        statesCovered: '["NY"]'
      }
    });

    await prisma.sighting.create({
      data: {
        species: 'Common Crane',
        scientificName: 'Grus grus',
        location: 'Ithaca, NY',
        date: new Date(),
        observer: 'John',
        details: 'Found in corn field',
        incidentId: incident.id
      }
    });

    // 2. Act: Trigger two summarization cycles concurrently
    await Promise.all([
      runSummarizationCycle(prisma),
      runSummarizationCycle(prisma)
    ]);

    // 3. Assert: Fetch should have been called only once for this incident
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
