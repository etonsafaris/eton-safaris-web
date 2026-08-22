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

const hasService = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
const keyKind = hasService ? 'service' : 'anon';
console.log('KEY_KIND', keyKind, 'SERVICE_LEN', hasService ? env.SUPABASE_SERVICE_ROLE_KEY.length : 0);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const table of ['Agent', 'registered_agents', 'profiles']) {
  const selected = await supabase.from(table).select('*').limit(1);
  if (selected.error) {
    console.log(table, 'SELECT_ERROR', selected.error.message);
    continue;
  }
  const row = selected.data?.[0] || {};
  console.log(
    table,
    'OK',
    'rows=' + (selected.data?.length || 0),
    'cols=' + Object.keys(row).join('|'),
    'idType=' + typeof row.id,
    'status=' + String(row.status || ''),
    'role=' + String(row.role || '')
  );
}

const probeEmail = `schema-probe-user-${Date.now()}@example.com`;
const created = await supabase.auth.admin.createUser({
  email: probeEmail,
  password: 'ProbePass123!',
  email_confirm: true,
  user_metadata: { role: 'Travel Agent' },
});
console.log('AUTH_ADMIN', created.error ? created.error.message : created.data.user ? 'OK' : 'NO_USER');
const signed = await anon.auth.signUp({
  email: `schema-probe-signup-${Date.now()}@example.com`,
  password: 'ProbePass123!',
  options: { data: { role: 'Travel Agent' } },
});
console.log('AUTH_SIGNUP', signed.error ? signed.error.message : signed.data.user ? 'OK id=' + typeof signed.data.user.id : 'NO_USER');

const fakeId = crypto.randomUUID();
const fakeInsert = await supabase.from('registered_agents').insert({
  name: 'Schema Probe',
  email: `schema-probe-fake-${Date.now()}@example.com`,
  status: 'Pending',
  user_id: fakeId,
});
console.log('INSERT_FAKE_USER_ID', fakeInsert.error ? fakeInsert.error.message : 'OK');
if (!fakeInsert.error) {
  await supabase.from('registered_agents').delete().eq('user_id', fakeId);
}
if (created.data.user) {
  const withUser = {
    name: 'Schema Probe',
    email: probeEmail,
    phone: '0700000000',
    country: 'Uganda',
    gender: 'Male',
    bio: 'Probe',
    status: 'Pending',
    role: 'Travel Agent',
    user_id: created.data.user.id,
    is_sample: false,
  };
  const exactInsert = await supabase.from('registered_agents').insert(withUser);
  console.log('registered_agents INSERT_WITH_USER', exactInsert.error ? exactInsert.error.message : 'OK');
  await supabase.from('registered_agents').delete().eq('email', probeEmail);
  await supabase.auth.admin.deleteUser(created.data.user.id);
}

const minimal = { name: 'Schema Probe', email: `schema-probe-min-${Date.now()}@example.com`, status: 'Pending' };
const minInsert = await supabase.from('registered_agents').insert(minimal);
console.log('registered_agents INSERT_MIN', minInsert.error ? minInsert.error.message : 'OK');
if (!minInsert.error) {
  await supabase.from('registered_agents').delete().eq('email', minimal.email);
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
