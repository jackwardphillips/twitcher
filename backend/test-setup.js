import { execSync } from 'child_process';

try {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    console.error('TEST_DATABASE_URL is required for tests. Use a disposable PostgreSQL database.');
    process.exit(1);
  }

  console.log('Generating Prisma client...');
  execSync('npx.cmd prisma generate', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl } });
  
  console.log('Running tests...');
  const args = process.argv.slice(2).join(' ');
  execSync(`npx.cmd vitest run ${args}`, { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
} catch (error) {
  process.exit(1);
}
