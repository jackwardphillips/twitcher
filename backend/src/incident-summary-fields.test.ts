import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Incident Summary Fields', () => {
  it('should have geminiSummary and summaryGeneratedAt fields on the Incident model', () => {
    // @ts-ignore - Fields might not exist yet in generated client
    const incidentFields = Object.values(Prisma.IncidentScalarFieldEnum);

    expect(incidentFields).toContain('geminiSummary');
    expect(incidentFields).toContain('summaryGeneratedAt');
  });
});
