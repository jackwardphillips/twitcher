import { fetchJson, fail, info, pass } from './ops-utils.js';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function check() {
  info(`backend=${backendUrl}`);
  info(`frontend=${frontendUrl}`);

  try {
    const processHealth = await fetchJson(`${backendUrl}/health`);
    if (processHealth.ok && typeof processHealth.body === 'object' && processHealth.body && 'ok' in processHealth.body) {
      pass('backend /health returned process health');
    } else {
      fail(`backend /health returned unexpected payload shape with HTTP ${processHealth.status}`);
    }
  } catch (error) {
    fail(`backend /health request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const apiHealth = await fetchJson(`${backendUrl}/api/health`);
    if (apiHealth.ok && typeof apiHealth.body === 'object' && apiHealth.body && 'ok' in apiHealth.body && 'database' in apiHealth.body) {
      pass('backend /api/health returned full health');
    } else {
      fail(`backend /api/health returned unexpected payload shape with HTTP ${apiHealth.status}`);
    }
  } catch (error) {
    fail(`backend /api/health request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const response = await fetch(frontendUrl, { method: 'HEAD' });
    if (response.ok) {
      pass('frontend responded to HEAD request');
    } else {
      fail(`frontend returned HTTP ${response.status}`);
    }
  } catch (error) {
    fail(`frontend request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check();
