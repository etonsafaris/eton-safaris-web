'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Star, X } from 'lucide-react';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import TourItinerary from '@/components/public/TourItinerary';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickNumber,
  pickStoredString,
  pickString,
  recordPublishedAt,
  slugify,
  visibleRecordHtml,
} from '@/lib/data';
import { matchesCategoryValue, matchesCountry } from '@/lib/country-utils';
import { destinationPublicPath } from '@/lib/cms-routes';
import { publicBodyHtml } from '@/lib/embedded-content';
import { stripPublicMoney } from '@/lib/public-money';
import { splitContentList } from '@/lib/content-list';
import { parseItinerariesFromRecord } from '@/lib/itinerary';
import MathCaptcha from '@/components/public/MathCaptcha';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyWorkspace } from '@/lib/notify';
import { generateBookingCode } from '@/lib/booking-code';
import { bookingCalendarEvent, googleCalendarUrl } from '@/lib/calendar';
import type { RecordRow } from '@/lib/types';
import Honeypot, { isSpamHoneypot } from '@/components/public/Honeypot';
import { useCmsLive } from '@/lib/cms-live';

export default function TourDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [tour, setTour] = useState<RecordRow | null>(null);
  const [related, setRelated] = useState<RecordRow[]>([]);
  const [status, setStatus] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [form, setForm] = useState({
    guest_name: '',
    email: '',
    phone: '',
    guests: '1',
    message: '',
    travel_date: '',
    country_of_residence: '',
    duration_of_stay: '',
  });
  const [honeypot, setHoneypot] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [review, setReview] = useState({ author: '', email: '', rating: 5, content: '', country: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const live = useCmsLive();

  useEffect(() => {
    fetchCollectionRecords('tours')
      .then((rows) => {
        const match = rows.find((row) => pickString(row, ['slug']) === slug || String(row.id) === slug) || null;
        setTour(match);
        const country = match ? pickString(match, ['country']) : '';
        const category = match ? pickString(match, ['category']) : '';
        const sameCountry = rows
          .filter(isPublishedRecord)
          .filter((row) => row !== match && (!country || matchesCountry(row, country)));
        const sameCategory = category
          ? sameCountry.filter((row) => matchesCategoryValue(row, category))
          : [];
        setRelated((sameCategory.length ? sameCategory : sameCountry).slice(0, 12));
      })
      .catch((error) => console.error(error))
      .finally(() => setReady(true));
  }, [slug, live]);

  const itineraries = useMemo(() => parseItinerariesFromRecord(tour), [tour]);
  const highlights = useMemo(
    () => splitContentList(pickStoredString(tour || {}, ['highlights'])).map(stripPublicMoney).filter(Boolean),
    [tour]
  );
  const includes = useMemo(
    () => splitContentList(pickStoredString(tour || {}, ['price_includes'])).map(stripPublicMoney).filter(Boolean),
    [tour]
  );
  const excludes = useMemo(
    () => splitContentList(pickStoredString(tour || {}, ['price_excludes'])).map(stripPublicMoney).filter(Boolean),
    [tour]
  );
  const journeyDetails = pickStoredString(tour || {}, ['journey_details']);
  const journeyMap = pickStoredString(tour || {}, ['journey_map_url']);

  async function book(event: React.FormEvent) {
    event.preventDefault();
    if (isSpamHoneypot(honeypot)) return;
    if (!captchaOk) {
      setStatus('Complete the security check before sending.');
      return;
    }
    const bookingCode = generateBookingCode();
    const payload = buildSavePayload('bookings', {
      ...form,
      guests: Number(form.guests) || 1,
      tour: getRecordTitle(tour || {}),
      destination: form.country_of_residence || pickString(tour || {}, ['country']),
      country: form.country_of_residence,
      message: form.message,
      travel_date: form.travel_date || null,
      status: 'Pending Booking',
      payment_status: 'Pending Booking',
      booking_code: bookingCode,
      amount_paid: 0,
    });
    const { data, error } = await saveWithColumnFallback('bookings', payload);
    if (error) {
      console.error(error);
      setStatus(error.message);
      return;
    }
    const calendarEvent = bookingCalendarEvent({
      guestName: form.guest_name,
      tour: getRecordTitle(tour || {}),
      destination: pickString(tour || {}, ['country']),
      travelDate: form.travel_date,
      email: form.email,
    });
    const calendarUrl = googleCalendarUrl(calendarEvent);
    await notifyWorkspace({
      title: 'New Booking',
      message: `${form.guest_name} (${form.email}) booked ${getRecordTitle(tour || {})}. Booking code: ${bookingCode}. Calendar: ${calendarUrl}`,
      category: 'booking',
      guestEmail: form.email,
    });
    const tourParam = pickString(tour || {}, ['slug']) || slug;
    const bookingId = data?.[0]?.id ? String(data[0].id) : '';
    if (typeof window !== 'undefined') {
      window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    }
    window.location.href = `/payment?tour=${encodeURIComponent(tourParam)}&booking=${encodeURIComponent(bookingId)}`;
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildSavePayload('reviews', {
      author: review.author.trim(),
      email: review.email.trim(),
      title: getRecordTitle(tour || {}),
      rating: review.rating,
      source: 'Website',
      content: review.content.trim(),
      country: review.country.trim(),
    });
    const response = await fetch('/api/public/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      console.error(body);
      setReviewStatus(body.error || 'Could not save the review.');
      return;
    }
    setReviewSubmitted(true);
    setReviewStatus('Review Submitted');
    setReview({ author: '', email: '', rating: 5, content: '', country: '' });
  }

  const countryName = pickString(tour || {}, ['country']);
  const countrySlug = countryName ? slugify(countryName) : '';

  if (!ready || !tour) {
    return (
      <PublicShell>
        {ready ? (
          <p className="px-4 py-20 text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <div className="h-[338px] bg-[#141612] md:h-[398px]" />
        )}
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PageHero
        variant="tour"
        title={getRecordTitle(tour)}
        image={getRecordImage(tour)}
        backHref={countrySlug ? destinationPublicPath(countrySlug) : '/'}
        backLabel={countryName ? `Back to ${countryName}` : 'Back to Home'}
        duration={pickNumber(tour, ['duration_days']) > 0 ? `${pickNumber(tour, ['duration_days'])} Days` : undefined}
        country={pickString(tour, ['country']) || undefined}
        groupSize="Flexible"
        published={recordPublishedAt(tour)}
      />
      <div className="bg-[#ececec]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2 text-sm">
          <span className="text-gray-500">Jump to:</span>
          <a href="#description" className="font-semibold text-[#00A651] hover:text-[#006400]">
            Description
          </a>
          <a href="#itinerary" className="font-semibold text-[#00A651] hover:text-[#006400]">
            Itinerary
          </a>
          <a href="#reviews" className="font-semibold text-[#00A651] hover:text-[#006400]">
            Reviews
          </a>
        </div>
      </div>
      <section className="bg-white">
        <div className="grid grid-cols-1 items-start gap-3 px-5 py-5 lg:grid-cols-4">
          <article className="min-w-0 lg:col-span-3 lg:pl-[30px] lg:pr-[50px]">
            <h2 id="description" className="content-subheading scroll-mt-24">
              Tour Overview
            </h2>
            {pickStoredString(tour, ['description_title']) ? (
              <h2 className="content-subheading">
                {pickStoredString(tour, ['description_title'])}
              </h2>
            ) : null}
            <div
              className="public-prose max-w-none text-black"
              style={{ fontFamily: 'system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif', textAlign: 'justify' }}
              dangerouslySetInnerHTML={{
                __html: publicBodyHtml(visibleRecordHtml(tour, ['description', 'content', 'excerpt'])),
              }}
            />

            {highlights.length > 0 && (
              <div>
                <h2 className="content-subheading">
                  Tour Highlights
                </h2>
                <ul className="list-none space-y-3 text-black">
                  {highlights.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#006400]">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(includes.length > 0 || excludes.length > 0) && (
              <div className="grid gap-8 md:grid-cols-2">
                {includes.length > 0 && (
                  <div>
                    <h2 className="content-subheading">
                      Includes
                    </h2>
                    <ul className="list-none space-y-3">
                      {includes.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00A651]">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {excludes.length > 0 && (
                  <div>
                    <h2 className="content-subheading">
                      Excludes
                    </h2>
                    <ul className="list-none space-y-3">
                      {excludes.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
                            <X className="h-3 w-3 text-white" strokeWidth={3} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <TourItinerary days={itineraries} />

            {journeyDetails || journeyMap ? (
              <div>
                <h2 className="content-subheading">
                  Journey Details
                </h2>
                {journeyDetails ? (
                  <div
                    className="public-prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: publicBodyHtml(journeyDetails) }}
                  />
                ) : null}
                {journeyMap ? (
                  <img src={journeyMap} alt="Journey map" className="mt-4 w-full rounded-xl object-cover" />
                ) : null}
              </div>
            ) : null}
          </article>

          <aside className="space-y-8 lg:col-span-1 lg:sticky lg:top-6">
            <form
              onSubmit={book}
              className="overflow-hidden rounded bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_0_rgba(0,0,0,0.14),0_1px_3px_0_rgba(0,0,0,0.12)]"
            >
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div className="relative border-b border-gray-100 px-5 py-4">
                <span className="absolute left-0 top-0 h-0 w-0 border-r-[22px] border-t-[22px] border-r-transparent border-t-[#5bc787]" />
                <h2 className="font-serif text-[28px] font-bold italic text-[#111]">Book this Tour</h2>
              </div>
              <div className="space-y-3 px-5 py-4">
                <input
                  required
                  placeholder="Full Names"
                  value={form.guest_name}
                  onChange={(event) => setForm({ ...form, guest_name: event.target.value })}
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
                  value={form.country_of_residence}
                  onChange={(event) => setForm({ ...form, country_of_residence: event.target.value })}
                  className="dav-filled-input"
                />
                <input
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="dav-filled-input"
                />
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
                  value={form.duration_of_stay}
                  onChange={(event) => setForm({ ...form, duration_of_stay: event.target.value })}
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
                  placeholder="Travel Plans *"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="dav-filled-input h-24 resize-y"
                />
                <div className="pt-1">
                  <MathCaptcha onValidChange={setCaptchaOk} />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full bg-[#5bc787] py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#3db56e]"
                >
                  Book Tour
                </button>
                {status && <p className="text-sm text-moss">{status}</p>}
              </div>
            </form>

            <form
              id="reviews"
              onSubmit={submitReview}
              className="scroll-mt-24 overflow-hidden rounded bg-white shadow-[0_2px_1px_-1px_rgba(0,0,0,0.2),0_1px_1px_0_rgba(0,0,0,0.14),0_1px_3px_0_rgba(0,0,0,0.12)]"
            >
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="font-serif text-2xl font-bold italic text-[#111]">Customers Feedback</h3>
                <p className="mt-1 text-sm text-gray-500">Rate this Tour</p>
              </div>
              <div className="space-y-3 px-5 py-4">
                <input
                  required
                  placeholder="Your name(s)"
                  value={review.author}
                  onChange={(event) => setReview({ ...review, author: event.target.value })}
                  className="dav-filled-input"
                />
                <input
                  required
                  type="email"
                  placeholder="Email *"
                  value={review.email}
                  onChange={(event) => setReview({ ...review, email: event.target.value })}
                  className="dav-filled-input"
                />
                <input
                  placeholder="Country of Residence"
                  value={review.country}
                  onChange={(event) => setReview({ ...review, country: event.target.value })}
                  className="dav-filled-input"
                />
                <p className="pt-1 text-sm font-medium text-gray-700">How Would You Rate This Tour?</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReview({ ...review, rating: star })}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={`h-7 w-7 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  placeholder="Share your experience..."
                  value={review.content}
                  onChange={(event) => setReview({ ...review, content: event.target.value })}
                  className="dav-filled-input h-28 resize-y"
                />
                <button
                  type="submit"
                  className="mt-2 w-full bg-[#5bc787] py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#3db56e]"
                >
                  Rate Tour
                </button>
                {reviewStatus && <p className="text-sm text-moss">{reviewStatus}</p>}
              </div>
            </form>
          </aside>
        </div>
      </section>
      <AmazingSafaris tours={related} />
      {reviewSubmitted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <p className="font-serif text-2xl font-bold text-[#006400]">Review Submitted</p>
            <p className="mt-2 text-sm text-gray-600">Thank you. Your review is now in the admin Reviews module.</p>
            <button
              type="button"
              onClick={() => setReviewSubmitted(false)}
              className="mt-5 rounded-full bg-[#00A651] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </PublicShell>
  );
}
