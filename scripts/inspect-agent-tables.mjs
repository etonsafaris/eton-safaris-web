import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

for (const table of ['Agent', 'registered_agents', 'profiles']) {
  const selected = await supabase.from(table).select('*').limit(1);
  if (selected.error) {
    console.log(table, 'SELECT_ERROR', selected.error.message);
    continue;
  }
  console.log(table, 'OK', 'rows=' + (selected.data?.length || 0), 'cols=' + Object.keys(selected.data?.[0] || {}).join('|'));
}

const probe = {
  username: 'Schema Probe',
  email: `schema-probe-${Date.now()}@example.com`,
  phoneNumber: '0700000000',
  country: 'Uganda',
  companyName: 'Probe',
  isActive: false,
};

for (const table of ['Agent', 'registered_agents']) {
  const inserted = await supabase.from(table).insert(probe);
  console.log(table, 'INSERT_DAVS', inserted.error ? inserted.error.message : 'OK');
  if (!inserted.error) {
    await supabase.from(table).delete().eq('email', probe.email);
  }
}

const snake = {
  name: 'Schema Probe',
  email: `schema-probe-snake-${Date.now()}@example.com`,
  phone: '0700000000',
  country: 'Uganda',
  company: 'Probe',
  status: 'Pending',
};

for (const table of ['Agent', 'registered_agents']) {
  const inserted = await supabase.from(table).insert(snake);
  console.log(table, 'INSERT_SNAKE', inserted.error ? inserted.error.message : 'OK');
  if (!inserted.error) {
    await supabase.from(table).delete().eq('email', snake.email);
  }
}
