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

export function guestRecordedFields(row: RecordRow, agentEmail = '') {
  const fields: Array<[string, string]> = [
    ['Guest name', pickString(row, ['guest_name', 'name'])],
    ['Email', pickString(row, ['email'])],
    ['Phone', pickString(row, ['phone', 'phoneNumber'])],
    ['Number of guests', pickString(row, ['guests'])],
    ['Tour', pickString(row, ['tour'])],
    ['Destination', pickString(row, ['destination'])],
    ['Travel date', pickString(row, ['travel_date']).slice(0, 10)],
    ['Travel plans', pickString(row, ['travel_plans'])],
    ['Status', pickString(row, ['status']) || 'Pending'],
    ['Booking code', pickString(row, ['booking_code'])],
    ['Agent', pickString(row, ['agent_email', 'agent', 'recorded_by']) || agentEmail],
    ['Notes', pickString(row, ['message'])],
  ];
  return fields.filter(([, value]) => Boolean(value && value !== '—'));
}

export function guestQuoteQuery(row: RecordRow) {
  const params = new URLSearchParams();
  const name = pickString(row, ['guest_name', 'name']);
  const email = pickString(row, ['email']);
  const phone = pickString(row, ['phone', 'phoneNumber']);
  const tour = pickString(row, ['tour', 'destination']);
  const guests = pickString(row, ['guests']);
  const travelDate = pickString(row, ['travel_date']).slice(0, 10);
  const message = pickString(row, ['travel_plans', 'message']);
  if (name) params.set('name', name);
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  if (tour) params.set('tour', tour);
  if (guests) params.set('guests', guests);
  if (travelDate) params.set('travel_date', travelDate);
  if (message) params.set('message', message);
  params.set('from', 'agent');
  return `/admin/quotations_inquiries?${params.toString()}`;
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
  const quotes = (await loadTable('quotations_inquiries')).filter((row) => {
    const haystack = `${pickString(row, ['title'])} ${pickString(row, ['message'])} ${pickString(row, ['agent_email', 'source'])}`.toLowerCase();
    return haystack.includes(email.toLowerCase()) && haystack.includes('agent');
  });
  const mappedQuotes = quotes.map((row) => ({
    ...row,
    guest_name: pickString(row, ['name', 'guest_name']) || pickString(row, ['email']),
    tour: pickString(row, ['tour']),
    destination: pickString(row, ['destination']),
  }));
  if (!bookings.length) return mappedQuotes;
  const seen = new Set(
    bookings.map((row) => `${pickString(row, ['email']).toLowerCase()}|${pickString(row, ['guest_name', 'name']).toLowerCase()}`)
  );
  return [
    ...bookings,
    ...mappedQuotes.filter((row) => {
      const key = `${pickString(row, ['email']).toLowerCase()}|${pickString(row, ['guest_name', 'name']).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
