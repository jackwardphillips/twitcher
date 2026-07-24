import { execFileSync } from 'child_process';
import pg from 'pg';
import {
  redactErrorMessage,
  redactUrl,
  validateConnectedIdentity,
  validateTestDatabaseEnvironment,
} from './test-db-guard.js';

try {
  const target = validateTestDatabaseEnvironment(process.env);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const client = new pg.Client({ connectionString: target.rawUrl });

  await client.connect();
  try {
    const result = await client.query(
      'SELECT current_database() AS "database", current_user AS "role"',
    );
    validateConnectedIdentity(target, result.rows[0]);
  } finally {
    await client.end();
  }

  console.log(`Validated disposable database: ${redactUrl(target.rawUrl)}`);
  console.log('Generating Prisma client...');
  execFileSync(npx, ['prisma', 'generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: target.rawUrl },
  });
  
  console.log('Running database tests...');
  execFileSync(npx, ['vitest', 'run', '--config', 'vitest.db.config.ts', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: target.rawUrl },
  });
} catch (error) {
  if (error instanceof Error && error.message) {
    console.error(`Database test preflight failed: ${redactErrorMessage(
      error.message,
      process.env.TEST_DATABASE_URL ?? '',
    )}`);
  }
  process.exit(1);
}
