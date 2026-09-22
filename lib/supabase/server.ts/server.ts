/**
 * Canonical server DB entry — pool + safe query helpers (`withPgClient` always releases).
 */
export { aivenFetch, db, getAivenPool, getPool, queryRows, withPgClient } from '@/lib/supabase/pool';
