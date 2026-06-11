import { fail, pass } from './ops-utils.js';

const required = [
  'DATABASE_URL',
  'IMAP_HOST',
  'IMAP_PORT',
  'IMAP_USER',
  'IMAP_PASS',
  'IMAP_SECURE',
];

const optional = [
  'BACKEND_URL',
  'FRONTEND_URL',
  'EBIRD_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'RENDER_API_KEY',
  'NEON_API_KEY',
  'VERCEL_TOKEN',
];

for (const name of required) {
  if (process.env[name]) {
    pass(`${name} is set`);
  } else {
    fail(`${name} is missing`);
  }
}

for (const name of optional) {
  if (process.env[name]) {
    pass(`${name} is set`);
  } else {
    console.log(`INFO ${name} is not set`);
  }
}

if (!process.env.RUN_STARTUP_INGESTION) {
  fail('RUN_STARTUP_INGESTION is missing');
} else if (process.env.RUN_STARTUP_INGESTION === 'true') {
  fail('RUN_STARTUP_INGESTION=true can cause startup ingestion in production');
} else {
  pass('RUN_STARTUP_INGESTION is not true');
}
