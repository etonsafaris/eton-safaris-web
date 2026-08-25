'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import MathCaptcha from '@/components/public/MathCaptcha';
import { usePublicDestinations } from '@/components/public/usePublicDestinations';
import { submitWebsiteInquiry } from '@/lib/submit-inquiry';

export default function QuoteRequestForm() {
  const searchParams = useSearchParams();
  const presetCountry = searchParams?.get('country') || searchParams?.get('destination') || '';
  const presetTour = searchParams?.get('tour') || '';
  const { destinations } = usePublicDestinations();

  const [form, setForm] = useState({
    name: '',
    email: '',
    residence: '',
    phone: '',
    destination: presetCountry,
    guests: '2',
    duration: '',
    travel_date: '',
    message: '',
  });
  const [honeypot, setHoneypot] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      destination: current.destination || presetCountry,
    }));
  }, [presetCountry]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    if (!captchaOk) {
      setStatus('Complete the security check before sending.');
      return;
    }
    setSaving(true);
    const interest = presetTour || form.destination || 'Safari quotation';
    const composed = [
      form.message.trim(),
      form.destination ? `Safari destination: ${form.destination}` : '',
      form.residence ? `Country of residence: ${form.residence}` : '',
      form.duration ? `Duration of stay: ${form.duration}` : '',
      form.guests ? `Travellers: ${form.guests}` : '',
      form.travel_date ? `Travel date: ${form.travel_date}` : '',
      presetTour ? `Tour: ${presetTour}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await submitWebsiteInquiry({
      name: form.name,
      email: form.email,
      phone: form.phone,
      tour: interest,
      destination: form.destination,
      guests: Number(form.guests) || 1,
      travel_date: form.travel_date || null,
      message: composed,
      title: `Quote request: ${interest}`,
      source: 'quote_request',
      notifyTitle: 'New Quote Request',
    });

    if (result.error) {
      setStatus(result.error.message);
      setSaving(false);
      return;
    }

    setStatus(
      result.emailed
        ? 'Quote request received. Our safari specialists will reply with a tailored itinerary.'
        : 'Quote request saved. We will contact you shortly with a tailored safari quotation.'
    );
    setForm({
      name: '',
      email: '',
      residence: '',
      phone: '',
      destination: presetCountry,
      guests: '2',
      duration: '',
      travel_date: '',
      message: '',
    });
    setSaving(false);
  }

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_0_rgba(0,0,0,0.14),0_1px_3px_0_rgba(0,0,0,0.12)]"
    >
      <Honeypot value={honeypot} onChange={setHoneypot} />
      <div className="relative border-b border-gray-100 px-5 py-4">
        <span className="absolute left-0 top-0 h-0 w-0 border-r-[22px] border-t-[22px] border-r-transparent border-t-[#5bc787]" />
        <h2 className="font-serif text-[28px] font-bold italic text-[#111]">Request a Quote</h2>
        <p className="public-article-body mt-1 text-sm text-[#555]">
          Tell us your dates, group size, and travel style. We will send a tailored safari quotation.
        </p>
      </div>
      <div className="space-y-3 px-5 py-5">
        {presetTour ? (
          <p className="rounded bg-[#f3f4f6] px-3 py-2 text-sm font-medium text-[#333]">Tour: {presetTour}</p>
        ) : null}
        <input
          required
          placeholder="Full Names"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="dav-filled-input"
        />
        <input
          required
          type="email"
          placeholder="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          className="dav-filled-input"
        />
        <input
          required
          placeholder="Country of Residence"
          value={form.residence}
          onChange={(event) => setForm({ ...form, residence: event.target.value })}
          className="dav-filled-input"
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          className="dav-filled-input"
        />
        <select
          required
          value={form.destination}
          onChange={(event) => setForm({ ...form, destination: event.target.value })}
          className="dav-filled-input"
          aria-label="Safari destination"
        >
          <option value="">Safari destination</option>
          {destinations.map((destination) => (
            <option key={destination.slug} value={destination.name}>
              {destination.name}
            </option>
          ))}
        </select>
        <input
          required
          type="number"
          min="1"
          placeholder="Number of travellers"
          value={form.guests}
          onChange={(event) => setForm({ ...form, guests: event.target.value })}
          className="dav-filled-input"
        />
        <input
          placeholder="Duration of stay"
          value={form.duration}
          onChange={(event) => setForm({ ...form, duration: event.target.value })}
          className="dav-filled-input"
        />
        <input
          type="date"
          value={form.travel_date}
          onChange={(event) => setForm({ ...form, travel_date: event.target.value })}
          className="dav-filled-input"
          aria-label="Travel Date"
        />
        <textarea
          required
          placeholder="Tell us more about your travel, level of accommodation, and message (it's ok to be detailed here)"
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          className="dav-filled-input min-h-[120px] resize-y"
        />
        <MathCaptcha onValidChange={setCaptchaOk} />
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full bg-[#5bc787] py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#3db56e] disabled:opacity-60"
        >
          {saving ? 'Sending…' : 'Request a Quote'}
        </button>
        {status ? <p className="public-article-body text-sm text-[#00A651]">{status}</p> : null}
      </div>
    </form>
  );
}
