/**
 * Ensure a Hyperdrive config exists for Aiven and write binding into wrangler.jsonc.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvFile } from './lib/parse-env-file.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_FILE = process.env.CLOUDFLARE_ENV_FILE || resolve(ROOT, '.env.local');
const STATE_PATH = resolve(ROOT, 'cloudflare.deploy.json');
const WRANGLER_PATH = resolve(ROOT, 'wrangler.jsonc');
const CONFIG_NAME = process.env.HYPERDRIVE_CONFIG_NAME || 'eton-safaris-aiven';

function runJson(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
  });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function findExistingId(listOutput, name) {
  try {
    const parsed = JSON.parse(listOutput);
    const items = Array.isArray(parsed) ? parsed : parsed.result || parsed.configs || [];
    const match = items.find((item) => item.name === name || item.id === name);
    return match?.id || null;
  } catch {
    return null;
  }
}

function patchWranglerHyperdrive(id) {
  let text = readFileSync(WRANGLER_PATH, 'utf8');
  const block = `  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "${id}"
    }
  ],`;

  if (/"hyperdrive"\s*:\s*\[/m.test(text)) {
    text = text.replace(/"hyperdrive"\s*:\s*\[[\s\S]*?\],/m, block);
  } else {
    text = text.replace(/"vars"\s*:\s*\{[\s\S]*?\},/m, (match) => `${match}\n${block}`);
  }

  writeFileSync(WRANGLER_PATH, text, 'utf8');
}

const env = parseEnvFile(ENV_FILE);
const databaseUrl = String(env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('[CF] DATABASE_URL missing — skip Hyperdrive setup.');
  process.exit(1);
}

const state = loadState();
let hyperdriveId = String(state.hyperdriveId || env.HYPERDRIVE_ID || '').trim();

if (!hyperdriveId) {
  const listed = runJson('npx', ['wrangler', 'hyperdrive', 'list', '--json']);
  hyperdriveId = findExistingId(listed.stdout, CONFIG_NAME) || '';
}

if (!hyperdriveId) {
  console.log(`[CF] Creating Hyperdrive config "${CONFIG_NAME}"…`);
  const created = runJson('npx', [
    'wrangler',
    'hyperdrive',
    'create',
    CONFIG_NAME,
    '--connection-string',
    databaseUrl,
  ]);
  if (created.status !== 0) {
    console.error(created.stderr || created.stdout);
    process.exit(created.status);
  }
  hyperdriveId =
    findExistingId(created.stdout, CONFIG_NAME) ||
    (created.stdout.match(/[0-9a-f]{32}/i)?.[0] ?? '');
  const listedAfter = runJson('npx', ['wrangler', 'hyperdrive', 'list', '--json']);
  hyperdriveId = hyperdriveId || findExistingId(listedAfter.stdout, CONFIG_NAME) || '';
}

if (!hyperdriveId) {
  console.error('[CF] Could not resolve Hyperdrive id. Set HYPERDRIVE_ID in .env.local and retry.');
  process.exit(1);
}

saveState({ hyperdriveId, configName: CONFIG_NAME, updatedAt: new Date().toISOString() });
patchWranglerHyperdrive(hyperdriveId);
console.log(`[CF] Hyperdrive ready (id ${hyperdriveId}).`);
