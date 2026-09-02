type SupabaseClient = any;
type User = { id: string; email?: string; user_metadata?: Record<string, unknown> };

function asEmail(value: string) {
  return value.trim().toLowerCase();
}

async function findAuthUserByEmail(client: SupabaseClient, email: string): Promise<User | null> {
  const needle = asEmail(email);
  if (!needle.includes('@')) return null;
  try {
    const listed = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = listed.data.users.find((user) => asEmail(user.email || '') === needle);
    if (match) return match;
  } catch {
    return null;
  }
  return null;
}

export async function ensureConfirmedAuthUser(
  client: SupabaseClient,
  input: { email: string; password?: string; name?: string; role?: string; userId?: string }
): Promise<User | null> {
  const email = asEmail(input.email);
  const password = input.password?.trim() || '';
  const metadata = {
    full_name: input.name?.trim() || '',
    role: input.role?.trim() || 'Travel Agent',
  };

  if (input.userId) {
    try {
      const updated = await client.auth.admin.updateUserById(input.userId, {
        email,
        email_confirm: true,
        user_metadata: metadata,
        ...(password.length >= 6 ? { password } : {}),
      });
      if (updated.data.user) return updated.data.user;
    } catch {
      /* fall through */
    }
  }

  const existing = await findAuthUserByEmail(client, email);
  if (existing) {
    try {
      const updated = await client.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
        user_metadata: { ...existing.user_metadata, ...metadata },
        ...(password.length >= 6 ? { password } : {}),
      });
      return updated.data.user || existing;
    } catch {
      return existing;
    }
  }

  if (password.length >= 6) {
    try {
      const created = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (created.data.user) return created.data.user;
    } catch {
      /* admin API needs the service role */
    }

    const signedUp = await client.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (signedUp.data.user) {
      try {
        await client.auth.admin.updateUserById(signedUp.data.user.id, { email_confirm: true });
      } catch {
        /* confirmation is best-effort without the service role */
      }
      return signedUp.data.user;
    }
  }

  return null;
}
