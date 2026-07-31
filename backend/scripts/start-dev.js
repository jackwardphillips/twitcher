import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['backend', 'frontend'].map((workspace) => spawn(
  npm,
  ['run', 'dev', '--prefix', workspace],
  {
    cwd: repositoryDirectory,
    env: process.env,
    stdio: 'inherit',
  },
));

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping && (code !== 0 || signal)) stop(code ?? 1);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
