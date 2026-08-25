import { notifyWorkspace } from '@/lib/notify';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';

export type WebsiteInquiryInput = {
  name: string;
  email: string;
  phone?: string;
  tour?: string;
  destination?: string;
  guests?: string | number | null;
  travel_date?: string | null;
  message: string;
  title: string;
  source: 'quote_request' | 'contact' | 'agent' | 'website';
  agent_email?: string;
  notifyTitle: string;
};

/**
 * Persist a website inquiry for the Quotation & Inquiry admin module,
 * and always create a dashboard notification.
 */
export async function submitWebsiteInquiry(input: WebsiteInquiryInput) {
  const row = {
    name: input.name,
    email: input.email,
    phone: input.phone || '',
    tour: input.tour || input.destination || '',
    destination: input.destination || '',
    guests: input.guests ?? null,
    travel_date: input.travel_date || null,
    message: input.message,
    title: input.title,
    source: input.source,
    agent_email: input.agent_email || '',
    status: 'Pending',
  };

  // Primary store for the Quotation & Inquiry module.
  const quotePayload = buildSavePayload('quotations_inquiries', row);
  let primary = await saveWithColumnFallback('quotations_inquiries', quotePayload);

  // Legacy inquiries table (best-effort).
  const inquiryPayload = buildSavePayload('inquiries', row);
  const legacy = await saveWithColumnFallback('inquiries', inquiryPayload);

  if (primary.error && !legacy.error) {
    primary = legacy;
  }

  if (primary.error && legacy.error) {
    return { error: primary.error, recorded: false, emailed: false };
  }

  const mail = await notifyWorkspace({
    title: input.notifyTitle,
    message: `${input.name} (${input.email}): ${input.message}`,
    category: 'inquiry',
    guestEmail: input.email,
    recordDashboard: true,
    emailAdmin: true,
  });

  return {
    error: null,
    recorded: Boolean(mail?.recorded),
    emailed: Boolean(mail?.emailed),
    id: primary.data?.[0]?.id ?? legacy.data?.[0]?.id,
  };
}
