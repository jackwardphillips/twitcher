import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from './lib/db';

describe('Ingestion Status API (Real DB)', () => {
  beforeEach(async () => {
    await prisma.incomingEmail.deleteMany();
    await prisma.ingestionRun.deleteMany();
  });

  it('should return null if no emails have been ingested', async () => {
    const response = await request(app).get('/api/ingestion-status');
    expect(response.status).toBe(200);
    expect(response.body.lastIngestedEmailDate).toBeNull();
    expect(response.body.latestRun).toBeNull();
  });

  it('should return the date of the last ingested email', async () => {
    const mockDate = new Date('2026-04-01T12:00:00Z');
    await prisma.incomingEmail.create({
      data: {
        messageId: 'status-test-1',
        subject: 'Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: mockDate,
        rawBody: '...',
        status: 'processed'
      }
    });

    const response = await request(app).get('/api/ingestion-status');
    expect(response.status).toBe(200);
    expect(new Date(response.body.lastIngestedEmailDate).toISOString()).toBe(mockDate.toISOString());
  });

  it('should only count processed eBird emails', async () => {
    // 1. Unprocessed email
    await prisma.incomingEmail.create({
      data: {
        messageId: 'status-test-2',
        subject: 'Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: new Date('2026-05-01T12:00:00Z'),
        rawBody: '...',
        status: 'new'
      }
    });

    // 2. Email from different sender
    await prisma.incomingEmail.create({
      data: {
        messageId: 'status-test-3',
        subject: 'Alert',
        from: 'someone-else@example.com',
        date: new Date('2026-05-01T13:00:00Z'),
        rawBody: '...',
        status: 'processed'
      }
    });

    const response = await request(app).get('/api/ingestion-status');
    expect(response.body.lastIngestedEmailDate).toBeNull();
  });

  it('should return the latest ingestion run', async () => {
    await prisma.ingestionRun.create({
      data: {
        status: 'success',
        finishedAt: new Date('2026-04-01T12:05:00Z'),
        emailsFound: 2,
        emailsIngested: 2,
        sightingsAdded: 3,
        trigger: 'api'
      }
    });

    const response = await request(app).get('/api/ingestion-status');
    expect(response.status).toBe(200);
    expect(response.body.latestRun.status).toBe('success');
    expect(response.body.latestRun.emailsFound).toBe(2);
    expect(response.body.startupIngestionEnabled).toBe(false);
  });
});
