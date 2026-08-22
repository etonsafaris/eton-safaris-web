import { supabase } from '@/lib/supabase/client';
import { pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const AGENT_MARK_FIELDS = [
  'agent_email',
  'agent',
  'created_by',
  'source',
  'referred_by',
  'recorded_by',
  'message',
];

export function bookingMatchesAgent(row: RecordRow, agentEmail: string) {
  const needle = agentEmail.trim().toLowerCase();
  if (!needle) return false;
  return AGENT_MARK_FIELDS.some((field) => pickString(row, [field]).toLowerCase().includes(needle));
}

export function agentBookingNote(agentEmail: string) {
  return `Recorded by agent ${agentEmail.trim()}`;
}

async function loadTable(table: string) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) return [] as RecordRow[];
  return (data as RecordRow[]) || [];
}

export async function fetchBookingsForAgent(agentEmail: string): Promise<RecordRow[]> {
  const email = agentEmail.trim();
  if (!email) return [];

  const bookings = (await loadTable('bookings')).filter((row) => bookingMatchesAgent(row, email));
  if (bookings.length) return bookings;

  const quotes = (await loadTable('quotations_inquiries')).filter((row) => {
    const haystack = `${pickString(row, ['title'])} ${pickString(row, ['message'])}`.toLowerCase();
    return haystack.includes(email.toLowerCase()) && haystack.includes('agent');
  });
  return quotes.map((row) => ({
    ...row,
    guest_name: pickString(row, ['name', 'guest_name']) || pickString(row, ['email']),
    tour: pickString(row, ['tour']),
    destination: pickString(row, ['destination']),
  }));
}
