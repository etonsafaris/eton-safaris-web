-- Optional: persist which agent recorded a booking.
-- Guest Logs work without this column; add it when you can run SQL in Supabase.
alter table public.bookings add column if not exists agent_email text;
create index if not exists bookings_agent_email_idx on public.bookings (agent_email);
