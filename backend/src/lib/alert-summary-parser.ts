export interface AlertSummaryTarget {
  species: string;
  regionName: string;
  expectedReports: number;
}

function decodeQuotedPrintable(text: string): string {
  let decoded = text.replace(/=\s*\r?\n/g, '');
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (_match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  try {
    const bytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return decoded;
  }
}

function normalizeSummarySpecies(species: string): string {
  return species.replace(/\s+\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

export function parseEBirdAlertSummary(content: string): AlertSummaryTarget[] {
  const decodedContent = decodeQuotedPrintable(content);
  const lines = decodedContent.split(/\r?\n/).map(line => line.trim());
  const targetsBySpeciesRegion = new Map<string, AlertSummaryTarget>();
  let inSummary = false;

  for (const line of lines) {
    if (line === '*** Species Summary:') {
      inSummary = true;
      continue;
    }

    if (!inSummary) continue;
    if (line.startsWith('---')) break;
    if (!line) continue;

    const summaryMatch = line.match(/^(.+?) \((\d+ .*)\)$/);
    if (!summaryMatch) continue;

    const species = normalizeSummarySpecies(summaryMatch[1] ?? '');
    const regionParts = (summaryMatch[2] ?? '').split(',');

    for (const regionPart of regionParts) {
      const regionMatch = regionPart.trim().match(/^(\d+)\s+(.+)$/);
      if (!regionMatch) continue;

      const regionName = (regionMatch[2] ?? '').trim();
      const key = `${species}\u0000${regionName}`;
      const expectedReports = parseInt(regionMatch[1] ?? '0', 10);
      const existing = targetsBySpeciesRegion.get(key);
      if (existing) {
        existing.expectedReports += expectedReports;
      } else {
        targetsBySpeciesRegion.set(key, {
          species,
          expectedReports,
          regionName,
        });
      }
    }
  }

  return Array.from(targetsBySpeciesRegion.values());
}
