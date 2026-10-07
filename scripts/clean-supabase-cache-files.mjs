/**
 * Delete local script cache files that still reference supabase.co
 * Usage: node scripts/clean-supabase-cache-files.mjs [--dry-run]
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const roots = [resolve(import.meta.dirname, '.cache'), resolve(import.meta.dirname, '..', 'public')];
const removed = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(json|txt|md|html|xml)$/i.test(name)) continue;
    let text = '';
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    if (!/supabase\.co/i.test(text)) continue;
    removed.push(path);
    if (!dryRun) unlinkSync(path);
  }
}

for (const root of roots) walk(root);
console.log(JSON.stringify({ dryRun, removedCount: removed.length, sample: removed.slice(0, 20) }, null, 2));
