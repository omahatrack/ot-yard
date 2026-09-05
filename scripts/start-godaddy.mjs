import { existsSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();
const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');

function runNodeScript(args, label) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`OTE startup: ${label} could not be launched:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`OTE startup: ${label} exited with code ${result.status ?? 'unknown'}.`);
    process.exit(result.status || 1);
  }
}

// Prepare/migrate the database before a build. Some Next.js routes can touch
// application data while compiling, so the schema must already be current.
runNodeScript(['scripts/bootstrap-db.mjs'], 'database bootstrap');

// GoDaddy PaaS can sometimes publish a preview bundle that contains node_modules
// and a partial .next directory. In that case its launcher skips the configured
// build step, even though the production manifests needed by `next start` are
// missing. Validate the build ourselves and self-heal if it is incomplete.
const requiredBuildFiles = [
  path.join(cwd, '.next', 'BUILD_ID'),
  path.join(cwd, '.next', 'prerender-manifest.json'),
  path.join(cwd, '.next', 'routes-manifest.json')
];

const buildReady = requiredBuildFiles.every(existsSync);
if (!buildReady) {
  console.log('OTE startup: production Next.js build is missing or incomplete; rebuilding now...');
  rmSync(path.join(cwd, '.next'), { recursive: true, force: true });
  runNodeScript([nextBin, 'build'], 'Next.js production build');

  const stillMissing = requiredBuildFiles.filter(file => !existsSync(file));
  if (stillMissing.length) {
    console.error('OTE startup: Next.js build completed but required artifacts are still missing:');
    for (const file of stillMissing) console.error(` - ${path.relative(cwd, file)}`);
    process.exit(1);
  }
}

console.log('OTE startup: database and production build ready; launching Next.js...');
const server = spawn(process.execPath, [nextBin, 'start', '-H', '0.0.0.0'], {
  cwd,
  env: process.env,
  stdio: 'inherit'
});

const forward = signal => {
  if (!server.killed) server.kill(signal);
};
process.on('SIGTERM', () => forward('SIGTERM'));
process.on('SIGINT', () => forward('SIGINT'));

server.on('error', err => {
  console.error('OTE startup: Next.js failed to launch:', err);
  process.exit(1);
});
server.on('exit', (code, signal) => {
  if (signal) {
    console.error(`OTE startup: Next.js exited from signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
