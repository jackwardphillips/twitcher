import { fetchJson, fail, info, pass } from './ops-utils.js';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

async function check() {
  info(`backend=${backendUrl}`);

  try {
    const response = await fetchJson(`${backendUrl}/api/ingestion-status`);
    if (!response.ok) {
      fail(`/api/ingestion-status returned HTTP ${response.status}`);
      return;
    }

    const body = response.body as {
      inProgress?: boolean;
      startupIngestionEnabled?: boolean;
      latestRun?: { status?: string; startedAt?: string; finishedAt?: string } | null;
    };

    pass('ingestion status endpoint reachable');

    if (body.inProgress) {
      fail('ingestion is currently running');
    } else {
      pass('no ingestion run is currently active');
    }

    if (body.startupIngestionEnabled) {
      fail('RUN_STARTUP_INGESTION is enabled');
    } else {
      pass('startup ingestion is disabled');
    }

    if (body.latestRun) {
      pass(`latest ingestion status=${body.latestRun.status ?? 'unknown'}`);
      info(`latestStartedAt=${body.latestRun.startedAt ?? 'unknown'}`);
      info(`latestFinishedAt=${body.latestRun.finishedAt ?? 'not finished'}`);
    } else {
      fail('no ingestion runs have been recorded');
    }
  } catch (error) {
    fail(`ingestion status request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check();
