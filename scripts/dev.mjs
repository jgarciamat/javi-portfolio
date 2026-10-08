#!/usr/bin/env node
/**
 * Local development: starts the API (http://localhost:3000) and, once it is
 * healthy, the web app (http://localhost:5176), opening it in the browser.
 * Ctrl+C stops both. No dependencies: plain Node.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_PORT = 5176;
const API_HEALTH = 'http://localhost:3000/api/health';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

for (const app of ['backend', 'frontend']) {
  if (!existsSync(join(root, app, 'node_modules'))) {
    console.error(`[dev] Missing ${app}/node_modules — run "npm run install:all" first.`);
    process.exit(1);
  }
}

function start(name, color, cwd, args, env = {}) {
  const child = spawn(npm, args, { cwd: join(root, cwd), env: { ...process.env, ...env } });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function waitForApi(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !stopping) {
    try {
      if ((await fetch(API_HEALTH)).ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

start('api', '36', 'backend', ['run', 'dev'], { APP_URL: `http://localhost:${WEB_PORT}` });
if (await waitForApi()) {
  const open = process.env.DEV_NO_OPEN ? [] : ['--open'];
  start('web', '35', 'frontend', ['run', 'dev', '--', '--port', String(WEB_PORT), '--strictPort', ...open]);
  console.log(`\n[dev] App: http://localhost:${WEB_PORT}   API: http://localhost:3000/api\n`);
} else if (!stopping) {
  console.error('[dev] The API did not become healthy in 60 s; check the [api] logs above.');
  shutdown(1);
}
