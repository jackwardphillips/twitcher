import { fetchJson, fail, info, pass } from './ops-utils.js';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
const days = process.env.DAYS ?? '7';

type SummaryEntry = { name: string; count: number };

function printEntries(label: string, entries: SummaryEntry[]) {
  if (entries.length === 0) {
    info(`${label}: none`);
    return;
  }

  info(label);
  for (const entry of entries.slice(0, 10)) {
    console.log(`- ${entry.name}: ${entry.count}`);
  }
}

async function check() {
  info(`backend=${backendUrl}`);
  info(`days=${days}`);

  try {
    const response = await fetchJson(`${backendUrl}/api/ops/enrichment-summary?days=${encodeURIComponent(days)}`);
    if (!response.ok) {
      fail(`/api/ops/enrichment-summary returned HTTP ${response.status}`);
      return;
    }

    const body = response.body as {
      totals?: {
        enrichmentAttempts?: number;
        matched?: number;
        missed?: number;
        errored?: number;
        ebirdApiCalls?: number;
      };
      topMissedSpecies?: SummaryEntry[];
      topMissedRegions?: SummaryEntry[];
      topRejectionReasons?: SummaryEntry[];
      apiErrorsByEndpoint?: SummaryEntry[];
    };

    pass('enrichment summary endpoint reachable');
    info(`attempts=${body.totals?.enrichmentAttempts ?? 0}`);
    info(`matched=${body.totals?.matched ?? 0}`);
    info(`missed=${body.totals?.missed ?? 0}`);
    info(`errored=${body.totals?.errored ?? 0}`);
    info(`ebirdApiCalls=${body.totals?.ebirdApiCalls ?? 0}`);

    printEntries('top missed species', body.topMissedSpecies ?? []);
    printEntries('top missed regions', body.topMissedRegions ?? []);
    printEntries('top rejection reasons', body.topRejectionReasons ?? []);
    printEntries('API errors by endpoint', body.apiErrorsByEndpoint ?? []);
  } catch (error) {
    fail(`enrichment summary request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check();
