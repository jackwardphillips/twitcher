import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';

try {
  console.log('Generating Prisma client...');
  execSync('npx.cmd prisma generate', { stdio: 'inherit' });

  if (existsSync('dev.db')) {
    console.log('Copying dev.db to test.db...');
    copyFileSync('dev.db', 'test.db');
  }

  process.env.DATABASE_URL = 'file:./test.db';
  
  console.log('Running tests...');
  const args = process.argv.slice(2).join(' ');
  execSync(`npx.cmd vitest run ${args}`, { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' }
  });
} catch (error) {
  process.exit(1);
}
