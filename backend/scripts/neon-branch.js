import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(backendDirectory, '..');
dotenv.config({ path: path.join(backendDirectory, '.env'), quiet: true });

function fail(message) {
  throw new Error(message);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function runNeon(args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, [
    '--yes',
    '--package=neonctl@2.38.5',
    '--',
    'neonctl',
    ...args,
  ], {
    cwd: backendDirectory,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    fail((result.stderr || result.stdout || `neonctl exited with ${result.status}`).trim());
  }
  return result.stdout.trim();
}

function neonJson(args) {
  const output = runNeon([...args, '--output', 'json']);
  try {
    return JSON.parse(output);
  } catch {
    fail('neonctl returned invalid JSON.');
  }
}

function findValue(value, keys) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) {
    if (typeof value[key] === 'string') return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findValue(child, keys);
    if (found) return found;
  }
  return undefined;
}

function branchList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.branches)) return value.branches;
  return [];
}

function projectArgs() {
  return ['--project-id', required('NEON_PROJECT_ID')];
}

function branchByName(name) {
  const branches = branchList(neonJson(['branches', 'list', ...projectArgs()]));
  return branches.find((branch) => branch.name === name);
}

function productionBranch() {
  const reference = process.env.NEON_PRODUCTION_BRANCH?.trim() || 'production';
  const branches = branchList(neonJson(['branches', 'list', ...projectArgs()]));
  const branch = branches.find((item) => item.id === reference || item.name === reference);
  if (!branch?.id) fail(`Configured production branch does not exist: ${reference}`);
  return branch;
}

function createBranch(name) {
  const existing = branchByName(name);
  if (existing) fail(`Neon branch already exists: ${name}`);

  const parent = productionBranch();
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const result = neonJson([
    'branches', 'create',
    ...projectArgs(),
    '--parent', parent.id,
    '--name', name,
    '--expires-at', expiresAt,
  ]);
  const id = findValue(result, ['id', 'branch_id']);
  if (!id) fail('Could not read the created Neon branch ID.');
  return { id, name };
}

function ensureBranch(name) {
  const existing = branchByName(name);
  const parent = productionBranch();
  if (existing) {
    if (existing.parent_id !== parent.id) {
      fail(`Persistent branch ${name} was not created from the configured production branch.`);
    }
    return { id: existing.id, name: existing.name };
  }

  const result = neonJson([
    'branches', 'create',
    ...projectArgs(),
    '--parent', parent.id,
    '--name', name,
  ]);
  const id = findValue(result, ['id', 'branch_id']);
  if (!id) fail('Could not read the created Neon branch ID.');
  return { id, name };
}

function connectionString(branch) {
  const output = runNeon([
    'connection-string', branch,
    ...projectArgs(),
    '--role-name', process.env.NEON_DATABASE_ROLE || 'neondb_owner',
    '--database-name', process.env.NEON_DATABASE_NAME || 'neondb',
    '--pooled',
    '--output', 'json',
  ]);
  let value = output;
  try {
    value = JSON.parse(output);
  } catch {
    // neonctl 2.38 emits the URL directly even when JSON output is requested.
  }
  const url = findValue(value, ['connection_string', 'connectionString', 'uri']);
  if (!url?.startsWith('postgres')) fail('Could not read the Neon connection string.');
  return url;
}

function deleteBranch(name, allowMissing = false) {
  const branch = branchByName(name);
  if (!branch) {
    if (allowMissing) return;
    fail(`Neon branch does not exist: ${name}`);
  }
  runNeon(['branches', 'delete', branch.id, ...projectArgs()]);
}

function runCommand(command, args, env, cwd = backendDirectory) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function ephemeralName(label = 'local') {
  return safeName(`test-${label}-${Date.now()}-${process.pid}`);
}

function githubOutput(values) {
  const output = required('GITHUB_OUTPUT');
  if (values.database_url) console.log(`::add-mask::${values.database_url}`);
  appendFileSync(output, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === 'dev') {
    const developer = safeName(process.env.NEON_DEVELOPER || process.env.USERNAME || process.env.USER || 'developer');
    const branch = ensureBranch(`dev-${developer}`);
    const url = connectionString(branch.id);
    console.log(`Using persistent Neon branch ${branch.name}.`);
    const environment = {
      DATABASE_URL: url,
      RUN_STARTUP_INGESTION: 'false',
      DISABLE_EXTERNAL_SIDE_EFFECTS: 'true',
    };
    const generateStatus = runCommand('npm', ['exec', '--', 'prisma', 'generate'], environment);
    if (generateStatus !== 0) process.exit(generateStatus);
    process.exit(runCommand('npm', ['run', 'start'], environment, repositoryDirectory));
  }

  if (command === 'test' || command === 'smoke') {
    const name = ephemeralName(process.env.GITHUB_RUN_ID || 'local');
    const branch = createBranch(name);
    console.log(`Created ephemeral Neon branch ${branch.name}.`);
    try {
      const url = connectionString(branch.id);
      const script = command === 'test' ? 'test:db:direct' : 'test:smoke:direct';
      const commandArgs = ['run', script, ...(args.length > 0 ? ['--', ...args] : [])];
      const environment = {
        DATABASE_URL: url,
        TEST_DATABASE_URL: url,
        PRODUCTION_DATABASE_URL: required('PRODUCTION_DATABASE_URL'),
        ALLOW_TEST_DATABASE_RESET: '1',
        ALLOW_NEON_BRANCH_RESET: '1',
        RUN_STARTUP_INGESTION: 'false',
        ...(command === 'smoke' ? { DISABLE_EXTERNAL_SIDE_EFFECTS: 'true' } : {}),
      };
      const migrateStatus = runCommand('npm', ['exec', '--', 'prisma', 'migrate', 'deploy'], environment);
      if (migrateStatus !== 0) {
        process.exitCode = migrateStatus;
        return;
      }
      process.exitCode = runCommand('npm', commandArgs, environment);
    } finally {
      deleteBranch(name, true);
      console.log(`Deleted ephemeral Neon branch ${name}.`);
    }
    return;
  }

  if (command === 'ci-create') {
    const name = safeName(required('NEON_BRANCH_NAME'));
    const branch = createBranch(name);
    githubOutput({ branch_name: branch.name, database_url: connectionString(branch.id) });
    console.log(`Created Neon branch ${branch.name}.`);
    return;
  }

  if (command === 'delete') {
    deleteBranch(args[0] || required('NEON_BRANCH_NAME'), true);
    console.log('Deleted Neon branch.');
    return;
  }

  if (command === 'delete-prefix') {
    const prefix = args[0] || required('NEON_BRANCH_PREFIX');
    const branches = branchList(neonJson(['branches', 'list', ...projectArgs()]));
    for (const branch of branches.filter((item) => item.name?.startsWith(prefix))) {
      runNeon(['branches', 'delete', branch.id, ...projectArgs()]);
      console.log(`Deleted Neon branch ${branch.name}.`);
    }
    return;
  }

  fail('Usage: neon-branch <dev|test|smoke|ci-create|delete|delete-prefix>');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
