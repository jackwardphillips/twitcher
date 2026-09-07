import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { enrichRecentSightings, saveSightings } from './sighting-service.js';
import { AlertTargetService } from './alert-target-service.js';
import { db } from './db.js';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

// Mock ImapClient
vi.mock('./imap-client.js');
// Mock sighting-service to allow failure injection
vi.mock('./sighting-service.js', async () => {
  const actual = await vi.importActual('./sighting-service.js') as any;
  return {
    ...actual,
    enrichRecentSightings: vi.fn(actual.enrichRecentSightings),
    saveSightings: vi.fn(actual.saveSightings),
  };
});

describe('IngestionService Integration', () => {
  let service: IngestionService;
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    (ImapClient as any).mockImplementation(() => mockImapClient);
    service = new IngestionService(mockImapClient);
    
    // Rarity seeds are usually needed for saveSightings to match rarity
    await db.rarityCode.upsert({
      where: { scientificName: 'Grus grus' },
      update: {},
      create: {
        scientificName: 'Grus grus',
        commonName: 'Common Crane',
        abaCode: 4,
      }
    });
  });

  const getRecentDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 30); // 30 mins ago
    return d;
  };

  const getRawBody = (date: Date) => {
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    return `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location 42.45, -76.48
- Map: http://maps.google.com/?q=42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;
  };

  it('should ingest unique emails and persist to real database', async () => {
    const date = getRecentDate();
    const mockEmail = { 
      messageId: 'msg-int-1', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody: getRawBody(date)
    };
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // Mock eBird API for enrichment (called by saveSightings if enrich=true)
    server.use(
      http.get('*/data/obs/geo/recent/notable', () => {
        return HttpResponse.json([]); // No matches found
      })
    );

    const result = await service.ingest(undefined, true);

    expect(result.status).toBe('success');
    expect(result.ingested).toBe(1);

    // Verify DB state
    const savedEmail = await db.incomingEmail.findUnique({
      where: { messageId: 'msg-int-1' }
    });
    expect(savedEmail).not.toBeNull();
    expect(savedEmail?.status).toBe('processed');

    const savedSighting = await db.sighting.findFirst({
      where: { species: 'Common Crane' }
    });
    expect(savedSighting).not.toBeNull();
    expect(savedSighting?.observer).toBe('John Doe');
    expect(savedSighting?.rarity).toBe(4);

    const emailAttempt = await db.emailIngestionAttempt.findFirst({
      where: { messageId: 'msg-int-1' }
    });
    expect(emailAttempt?.status).toBe('processed');
    expect(emailAttempt?.parsedSightings).toBe(1);
    expect(emailAttempt?.parsedSummary).toContain('Common Crane');
  });

  it('should handle eBird API failures by marking email as processed but with partial enrichment failure', async () => {
    const date = getRecentDate();
    const mockEmail = { 
      messageId: 'msg-int-fail-enrich', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody: getRawBody(date) 
    };
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // Mock a non-retryable eBird API failure so this integration test does
    // not wait through the production backoff schedule.
    server.use(
      http.get('*/data/obs/geo/recent/notable', () => {
        return new HttpResponse(null, { status: 403 });
      })
    );

    const result = await service.ingest(undefined, true);

    expect(result.status).toBe('success');
    expect(result.enrichmentStatus).toBe('failed');
    
    // Email should still be 'processed' because the sighting was saved, only enrichment failed
    const savedEmail = await db.incomingEmail.findUnique({
      where: { messageId: 'msg-int-fail-enrich' }
    });
    expect(savedEmail?.status).toBe('processed');

    const enrichmentAttempt = await db.enrichmentAttempt.findFirst({
      where: {
        species: 'Common Crane',
        status: 'error',
        rejectionReason: 'api_error',
      }
    });
    expect(enrichmentAttempt?.rejectionReason).toBe('api_error');

    const apiCall = await db.ebirdApiCallLog.findFirst({
      where: { endpoint: '/data/obs/geo/recent/notable' }
    });
    expect(apiCall?.httpStatus).toBe(403);
  });

  it('should retry failed ingestions from previous runs', async () => {
    // This is the failing test for the new requirement
    const date = getRecentDate();
    const body = getRawBody(date);

    // 1. Arrange: Create a failed email in the DB
    await db.incomingEmail.create({
      data: {
        messageId: 'msg-retry-1',
        subject: 'Failed Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody: body,
        status: 'failed'
      }
    });

    // Mock IMAP to return no NEW emails
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);

    // 2. Act: Run ingestion
    const result = await service.ingest();

    // 3. Assert: It should have attempted to retry the failed one
    expect(result.ingested).toBe(1);
    
    const retriedEmail = await db.incomingEmail.findUnique({
      where: { messageId: 'msg-retry-1' }
    });
    expect(retriedEmail?.status).toBe('processed');
  });

  it('should return no_new_emails when both IMAP and DB are empty', async () => {
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);
    const result = await service.ingest();
    expect(result.status).toBe('no_new_emails');
  });

  it('should skip already processed emails', async () => {
    const date = getRecentDate();
    const mockEmail = { 
      messageId: 'msg-skip', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody: getRawBody(date)
    };
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // Already processed in DB
    await db.incomingEmail.create({
      data: {
        messageId: 'msg-skip',
        subject: 'Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody: getRawBody(date),
        status: 'processed'
      }
    });

    const result = await service.ingest();
    expect(result.skipped).toBe(1);
    expect(result.ingested).toBe(0);

    const emailAttempt = await db.emailIngestionAttempt.findFirst({
      where: { messageId: 'msg-skip' }
    });
    expect(emailAttempt?.status).toBe('skipped_processed');
  });

  it('should mark email as failed if saveSightings throws', async () => {
    const date = getRecentDate();
    const mockEmail = { 
      messageId: 'msg-fail-save', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody: getRawBody(date)
    };
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // Inject failure into saveSightings
    vi.mocked(saveSightings).mockRejectedValueOnce(new Error('Database explosion'));

    const result = await service.ingest();

    expect(result.failed).toBe(1);
    expect(result.ingested).toBe(0);

    const savedEmail = await db.incomingEmail.findUnique({
      where: { messageId: 'msg-fail-save' }
    });
    expect(savedEmail?.status).toBe('failed');
  });

  it('should roll back all core writes when persistence fails partway through', async () => {
    const date = getRecentDate();
    mockImapClient.fetchRecentAlerts.mockResolvedValue([{
      messageId: 'msg-atomic-rollback',
      subject: 'Alert',
      from: 'ebird-alert@birds.cornell.edu',
      date,
      rawBody: getRawBody(date),
    }]);

    vi.spyOn(AlertTargetService.prototype, 'upsertTargetsFromEmail')
      .mockImplementationOnce(async (_content, sourceEmailId, emailDate, client) => {
        if (!client || sourceEmailId == null) throw new Error('Missing transaction context');
        await client.alertTarget.create({
          data: {
            speciesName: 'Atomic Rollback Bird',
            regionName: 'New York',
            regionCode: 'US-NY',
            sourceEmailId,
            firstSeenInEmailAt: emailDate ?? date,
            lastSeenInEmailAt: emailDate ?? date,
          },
        });
        throw new Error('Injected failure after first core write');
      });

    const result = await service.ingest(undefined, false);

    expect(result.failed).toBe(1);
    expect(await db.alertTarget.count({ where: { speciesName: 'Atomic Rollback Bird' } })).toBe(0);
    expect(await db.sighting.count({ where: { incomingEmail: { messageId: 'msg-atomic-rollback' } } })).toBe(0);
    expect(await db.incomingEmail.findUnique({ where: { messageId: 'msg-atomic-rollback' } }))
      .toMatchObject({ status: 'failed' });
  });

  it('should retry without duplicating parsed sightings', async () => {
    const date = getRecentDate();
    const mockEmail = {
      messageId: 'msg-idempotent-retry',
      subject: 'Alert',
      from: 'ebird-alert@birds.cornell.edu',
      date,
      rawBody: getRawBody(date),
    };
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    const first = await service.ingest(undefined, false);
    const persistedSighting = await db.sighting.findFirstOrThrow({
      where: { incomingEmail: { messageId: 'msg-idempotent-retry' } },
    });
    const originalIncident = persistedSighting.incidentId
      ? await db.incident.findUniqueOrThrow({ where: { id: persistedSighting.incidentId } })
      : null;
    await db.sighting.update({
      where: { id: persistedSighting.id },
      data: { incomingEmailId: null, sourceIndex: null },
    });
    await db.incomingEmail.update({
      where: { messageId: 'msg-idempotent-retry' },
      data: { status: 'failed' },
    });
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);
    const second = await service.ingest(undefined, false);

    expect(first.ingested).toBe(1);
    expect(second.ingested).toBe(1);
    expect(await db.sighting.count({
      where: {
        OR: [
          { id: persistedSighting.id },
          { incomingEmail: { messageId: 'msg-idempotent-retry' } },
        ],
      },
    })).toBe(1);
    await expect(db.sighting.findUniqueOrThrow({ where: { id: persistedSighting.id } }))
      .resolves.toMatchObject({ sourceIndex: 0 });
    if (originalIncident) {
      await expect(db.incident.findUniqueOrThrow({ where: { id: originalIncident.id } }))
        .resolves.toMatchObject({ sightingCount: originalIncident.sightingCount });
    }
  });

  it('should classify an enrichment failure even when the query attempted no sightings', async () => {
    const date = getRecentDate();
    mockImapClient.fetchRecentAlerts.mockResolvedValue([{
      messageId: 'msg-enrichment-query-failure',
      subject: 'Alert',
      from: 'ebird-alert@birds.cornell.edu',
      date,
      rawBody: getRawBody(date),
    }]);
    vi.mocked(enrichRecentSightings).mockResolvedValueOnce({
      attempted: 0,
      succeeded: 0,
      failed: 1,
    });

    const result = await service.ingest(undefined, true);

    expect(result.enrichmentStatus).toBe('failed');
  });

  it('should not retry committed core writes when attempt logging fails afterward', async () => {
    const date = getRecentDate();
    mockImapClient.fetchRecentAlerts.mockResolvedValue([{
      messageId: 'msg-post-commit-log-failure',
      subject: 'Alert',
      from: 'ebird-alert@birds.cornell.edu',
      date,
      rawBody: getRawBody(date),
    }]);
    vi.spyOn(db.emailIngestionAttempt, 'update')
      .mockRejectedValueOnce(new Error('Injected logging failure'));

    const result = await service.ingest(undefined, false);

    expect(result.ingested).toBe(1);
    expect(result.failed).toBe(0);
    expect(await db.incomingEmail.findUnique({
      where: { messageId: 'msg-post-commit-log-failure' },
    })).toMatchObject({ status: 'processed' });
    expect(await db.sighting.count({
      where: { incomingEmail: { messageId: 'msg-post-commit-log-failure' } },
    })).toBe(1);
  });
});
