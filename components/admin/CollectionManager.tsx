'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LayoutGrid, List, Plus, RefreshCw, Search, X } from 'lucide-react';
import AdminLogoLoader from '@/components/admin/AdminLogoLoader';
import AdminItemCard from '@/components/admin/AdminItemCard';
import OpsRecordTable, { type OpsColumn } from '@/components/admin/OpsRecordTable';
import type { CollectionConfig, FormField, RecordRow } from '@/lib/types';
import {
  adminListColumnsFor,
  fetchCollectionPage,
  fetchCollectionRecords,
  fetchParksForCountry,
  formatColumnLabel,
  getDynamicColumns,
  getRecordImage,
  getRecordTitle,
  pickString,
  pickNumber,
  pickRecordId,
  publicRecordSlug,
  recordPublishedAt,
  publishStampForSave,
  slugify,
  isLanguagePost,
  clearCollectionCache,
} from '@/lib/data';
import { NAV_COUNTRIES, OTHER_DESTINATIONS, SITE } from '@/lib/collections';
import { notifyWorkspace } from '@/lib/notify';
import NotificationDetailModal from '@/components/admin/NotificationDetailModal';
import { adminAuthHeaders, fetchAdminTable } from '@/lib/admin-records-client';
import { bookingCalendarEvent, googleCalendarUrl } from '@/lib/calendar';
import { supabase } from '@/lib/supabase/client';
import SeoPanel from '@/components/admin/SeoPanel';
import CoverImageField from '@/components/admin/CoverImageField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/admin/SearchableSelect';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { destinationPublicPath, landingPreviewPath, pagePublicPath } from '@/lib/cms-routes';
import { notifyAdminItemSaved, publishPublicSite } from '@/lib/admin-item-notify';
import { ensureDefaultCmsPages, ensureDefaultLandingPages } from '@/lib/ensure-cms-defaults';
import { countryCategoryPath, canonicalCountrySlug, matchesCountry, publicCountrySlug } from '@/lib/country-utils';
import { generateBookingCode } from '@/lib/booking-code';
import {
  bookingStatusAfterPayment,
  guestPaymentNotice,
  normalizeBookingStatus,
  paymentStatusAfterAmount,
} from '@/lib/booking-status';
import { fetchBookingsForAgent } from '@/lib/agent-bookings';
import {
  isUnreadNotification,
  markNotificationReadPayload,
  notifyAdminNotificationsChanged,
} from '@/lib/notification-utils';
import { embedContent, extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { parseCmsPageExtras, serializeFaqs, faqRowsForStorage, type PageFaq } from '@/lib/cms-page-model';
import { faqsForEditor } from '@/lib/default-faqs';

export default function CollectionManager({ config }: { config: CollectionConfig }) {
  const router = useRouter();
  const isTours = config.id === 'tours';
  const isSafariUpdates = config.id === 'safari_updates';
  const isCountries = config.id === 'countries';
  const isCategories = config.id === 'categories';
  const isNationalPark = config.id === 'national_park';
  const isAccommodations = config.id === 'accommodations';
  const isExplore = config.id === 'explore';
  const isPages = config.id === 'pages';
  const isLandingPages = config.id === 'landing_pages';
  const isNotifications = config.id === 'notifications';
  const isOps = [
    'bookings',
    'inquiries',
    'quotations_inquiries',
    'pesapal_payments',
    'registered_agents',
    'notifications',
    'subscribers',
  ].includes(config.id);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [seo, setSeo] = useState<SeoValues>(defaultSeoValues());
  const [saving, setSaving] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');
  const [parkFilter, setParkFilter] = useState('');
  const [parkRows, setParkRows] = useState<RecordRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [postKind, setPostKind] = useState<'standard' | 'language'>('standard');
  const [seoSaved, setSeoSaved] = useState(false);
  const [guestLogsAgent, setGuestLogsAgent] = useState<RecordRow | null>(null);
  const [guestLogs, setGuestLogs] = useState<RecordRow[]>([]);
  const [guestLogsLoading, setGuestLogsLoading] = useState(false);
  const [paymentHistoryBooking, setPaymentHistoryBooking] = useState<RecordRow | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<RecordRow[]>([]);
  const [faqs, setFaqs] = useState<PageFaq[]>([]);
  const [viewingNotice, setViewingNotice] = useState<RecordRow | null>(null);
  const usesFaqs = isCountries || isCategories || isPages || isLandingPages;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 48;
  const [remoteTotal, setRemoteTotal] = useState(0);
  const usesRemotePaging = isTours || isNationalPark || isAccommodations || isSafariUpdates || isExplore;

  async function load() {
    if (!config.table) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setActionError('');
    try {
      clearCollectionCache(config.table);
      (config.aliases || []).forEach((alias) => clearCollectionCache(alias));
      const listColumns = adminListColumnsFor(config.table, config.aliases || []);
      const listOptions = listColumns ? { columns: listColumns } : undefined;
      let data: RecordRow[] = [];
      let total = 0;
      if (isOps) {
        try {
          data = await fetchAdminTable(config.table);
          total = data.length;
        } catch {
          data = await fetchCollectionRecords(config.table, config.aliases, listOptions);
          total = data.length;
        }
      } else if (usesRemotePaging) {
        const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
        const paged = await fetchCollectionPage(config.table, config.aliases || [], {
          columns: listColumns,
          limit: PAGE_SIZE,
          offset,
          orderBy: 'created_date',
          filters: {
            country: isSafariUpdates ? undefined : countryFilter || undefined,
            park: isAccommodations ? parkFilter || undefined : undefined,
            category: isTours ? categoryFilter || undefined : undefined,
          },
        });
        data = paged.rows;
        total = paged.total;
      } else {
        data = await fetchCollectionRecords(config.table, config.aliases, listOptions);
        total = data.length;
      }
      if (config.id === 'pages') {
        const created = await ensureDefaultCmsPages();
        if (created > 0) {
          data = await fetchCollectionRecords(config.table, config.aliases, listOptions);
          total = data.length;
        }
      }
      if (config.id === 'landing_pages') {
        const created = await ensureDefaultLandingPages();
        if (created > 0) {
          data = await fetchCollectionRecords(config.table, config.aliases, listOptions);
          total = data.length;
        }
      }
      setRemoteTotal(total);
      setRecords(
        data.slice().sort((a, b) => {
          const aDate = String(a.created_date || a.created_at || '');
          const bDate = String(b.created_date || b.created_at || '');
          return bDate.localeCompare(aDate);
        }).map((row) => {
          const id = pickRecordId(row);
          return id != null && (row.id === undefined || row.id === null || row.id === '') ? { ...row, id } : row;
        })
      );
      if (data.length === 0) {
        console.error(`[Supabase] "${config.table}" returned 0 rows. Check RLS policies or empty table.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records';
      console.error(err);
      setError(message);
      setRecords([]);
      setRemoteTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table, usesRemotePaging ? page : 0, countryFilter, parkFilter, categoryFilter]);

  useEffect(() => {
    if (!isAccommodations) return;
    if (!countryFilter) {
      setParkRows([]);
      return;
    }
    fetchParksForCountry(countryFilter)
      .then(setParkRows)
      .catch(() => setParkRows([]));
  }, [isAccommodations, countryFilter]);

  const columns = useMemo(() => getDynamicColumns(records), [records]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return records.filter((record) => {
      if (isSafariUpdates) {
        const language = isLanguagePost(record);
        if (postKind === 'language' ? !language : language) return false;
      }
      if (countryFilter && !usesRemotePaging) {
        const country = String(record.country ?? record.destination ?? '').toLowerCase();
        if (!country.includes(countryFilter.toLowerCase())) return false;
      }
      if (isAccommodations && parkFilter && !usesRemotePaging) {
        const park = [
          record.national_park,
          record.national_park_name,
          record.park,
          record.park_name,
          record.location,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        if (!park.includes(parkFilter.toLowerCase())) return false;
      }
      if (isTours && categoryFilter && !usesRemotePaging) {
        const category = String(record.category ?? record.category_name ?? '').toLowerCase();
        if (category !== categoryFilter.toLowerCase()) return false;
      }
      if (!needle) return true;
      return Object.keys(record).some((key) => String(record[key] ?? '').toLowerCase().includes(needle));
    });
  }, [records, query, countryFilter, parkFilter, categoryFilter, postKind, isSafariUpdates, isTours, isAccommodations, usesRemotePaging]);

  useEffect(() => {
    setPage(1);
  }, [query, countryFilter, parkFilter, categoryFilter, postKind, config.table]);

  const listTotal = usesRemotePaging && !query
    ? remoteTotal
    : filtered.length;
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const paged = useMemo(() => {
    if (usesRemotePaging && !query) {
      return filtered;
    }
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, usesRemotePaging, query]);

  const categoryOptions = useMemo(() => {
    if (!isTours) return [];
    const pool = countryFilter
      ? records.filter((record) =>
          String(record.country ?? record.destination ?? '')
            .toLowerCase()
            .includes(countryFilter.toLowerCase())
        )
      : records;
    return Array.from(
      new Set(pool.map((record) => String(record.category || record.category_name || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [records, countryFilter, isTours]);

  const parkOptions = useMemo(() => {
    if (!isAccommodations || !countryFilter) return [];
    return parkRows
      .filter((row) => matchesCountry(row, countryFilter) || canonicalCountrySlug(pickString(row, ['country'])) === canonicalCountrySlug(countryFilter))
      .map((row) => getRecordTitle(row))
      .filter(Boolean)
      .filter((name, index, all) => all.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [parkRows, countryFilter, isAccommodations]);

  const countryOptions = useMemo(() => {
    const fromRecords = Array.from(
      new Set(records.map((record) => String(record.country || record.destination || '').trim()).filter(Boolean))
    );
    const defaults = [...NAV_COUNTRIES.map((item) => item.name), ...OTHER_DESTINATIONS.map((item) => item.name)];
    return Array.from(new Set([...defaults, ...fromRecords]));
  }, [records]);

  function publicHref(record: RecordRow): string | null {
    if (config.id === 'categories') {
      const country = pickString(record, ['country']);
      const countryKey = canonicalCountrySlug(country) || publicCountrySlug({ name: country, slug: country });
      // Path uses current category name via categoryPublicSlug (not a stale rename slug).
      if (countryKey) return countryCategoryPath(countryKey, record);
      const value = pickString(record, ['name', 'title']) || pickString(record, ['slug']);
      return value ? `/tours?category=${encodeURIComponent(value)}` : null;
    }
    if (config.id === 'countries') {
      const slug = publicCountrySlug(record) || slugify(getRecordTitle(record));
      return slug ? destinationPublicPath(slug) : null;
    }
    const slug =
      publicRecordSlug(record) ||
      pickString(record, ['slug']) ||
      (record.id !== undefined && record.id !== null ? String(record.id) : '') ||
      slugify(getRecordTitle(record));
    if (config.id === 'pages' && slug) {
      if (slug === 'home-page' || slug === 'home' || slug === 'homepage') return '/';
      return pagePublicPath(slug);
    }
    if (config.id === 'landing_pages') {
      const landingSlug = pickString(record, ['slug', 'seo_slug']) || pickString(record, ['country']);
      return landingSlug ? landingPreviewPath(landingSlug) : null;
    }
    if (!config.publicPath) return null;
    if (!slug) return null;
    return `${config.publicPath.replace(/\/$/, '')}/${slug.replace(/^\//, '')}`;
  }

  function cardBadge() {
    const badges: Record<string, string> = {
      safari_updates: 'SAFARI POST',
      tours: 'TOUR',
      countries: 'DESTINATION',
      categories: 'CATEGORY',
      national_park: 'PARK',
      accommodations: 'STAY',
      explore: 'PLACE',
      pages: 'PAGE',
      landing_pages: 'LANDING',
      bookings: 'BOOKING',
      inquiries: 'INQUIRY',
      pesapal_payments: 'PAYMENT',
      subscribers: 'SUBSCRIBER',
      registered_agents: 'AGENT',
      notifications: 'NOTICE',
    };
    return badges[config.id] || config.label.toUpperCase();
  }

  function cardDate(record: RecordRow) {
    const raw = recordPublishedAt(record) || pickString(record, ['travel_date']);
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  }

  function opsColumns(): OpsColumn[] {
    if (config.id === 'bookings') {
      return [
        { label: 'Guest', keys: ['guest_name', 'name'] },
        { label: 'Email', keys: ['email'] },
        { label: 'Tour', keys: ['tour'] },
        { label: 'Destination', keys: ['destination'] },
        { label: 'Travel date', keys: ['travel_date'], date: true },
        { label: 'Booking code', keys: ['booking_code'] },
        { label: 'Payment', keys: ['payment_status', 'status'], badge: true },
        { label: 'Paid', keys: ['amount_paid'], money: true },
        { label: 'Balance', keys: ['remaining_balance'], money: true },
        { label: 'Tour fee', keys: ['final_tour_price'], money: true },
        { label: 'Guests', keys: ['guests'] },
        { label: 'Phone', keys: ['phone'] },
        { label: 'Status', keys: ['status'], badge: true },
      ];
    }
    if (config.id === 'inquiries') {
      return [
        { label: 'Name', keys: ['name', 'guest_name'] },
        { label: 'Email', keys: ['email'] },
        { label: 'Phone', keys: ['phone'] },
        { label: 'Tour / destination', keys: ['tour', 'destination', 'title'] },
        { label: 'Message', keys: ['message'], clamp: true },
        { label: 'Status', keys: ['status'], badge: true },
        { label: 'Received', keys: ['created_at'], date: true },
      ];
    }
    if (config.id === 'pesapal_payments') {
      return [
        { label: 'Reference', keys: ['reference', 'order_tracking_id'] },
        { label: 'Email', keys: ['email'] },
        { label: 'Tour', keys: ['tour'] },
        { label: 'Amount', keys: ['pesapal_amount', 'amount', 'total_amount'], money: true },
        { label: 'Type', keys: ['payment_type'] },
        { label: 'Status', keys: ['status'], badge: true },
        { label: 'Tracking ID', keys: ['order_tracking_id'] },
        { label: 'Date', keys: ['created_at'], date: true },
      ];
    }
    if (config.id === 'registered_agents') {
      return [
        { label: 'Name', keys: ['name', 'full_name'] },
        { label: 'Email', keys: ['email'] },
        { label: 'Country', keys: ['country'] },
        { label: 'Phone', keys: ['phone'] },
        { label: 'Company', keys: ['company'] },
        { label: 'Status', keys: ['status'], badge: true },
        { label: 'Registered', keys: ['created_at'], date: true },
      ];
    }
    if (config.id === 'notifications') {
      return [
        { label: 'Title', keys: ['title'] },
        { label: 'Message', keys: ['message', 'body', 'content'], clamp: true },
        { label: 'Category', keys: ['category'], badge: true },
        { label: 'Status', keys: ['status'], badge: true },
        { label: 'Date', keys: ['created_at', 'created_date'], date: true },
      ];
    }
    return [
      { label: 'Email', keys: ['email'] },
      { label: 'Subscribed', keys: ['created_at'], date: true },
    ];
  }

  function agentIsActive(record: RecordRow) {
    return pickString(record, ['status']).trim().toLowerCase() === 'active';
  }

  function opsActionButton(label: string, onClick: () => void) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-[#00A651]/30 bg-[#00A651]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#00A651] hover:bg-[#00A651] hover:text-white"
      >
        {label}
      </button>
    );
  }

  function opsActions(record: RecordRow) {
    return (
      <>
        {config.id === 'inquiries' &&
          opsActionButton('Create Quote', () =>
            router.push(`/admin/quotations_inquiries?inquiry=${encodeURIComponent(String(record.id || ''))}`)
          )}
        {config.id === 'bookings' && (
          <>
            {opsActionButton('Confirm Down Payment', () => confirmDownPayment(record))}
            {opsActionButton('Payment History', () => viewPayments(record))}
          </>
        )}
        {config.id === 'registered_agents' && (
          <>
            {opsActionButton('View Guest Logs', () => viewGuestLogs(record))}
            {opsActionButton(
              agentIsActive(record) ? 'Deactivate' : 'Activate',
              () => void setAgentStatus(record, agentIsActive(record) ? 'Inactive' : 'Active')
            )}
          </>
        )}
      </>
    );
  }

  function cardActions(record: RecordRow) {
    return (
      <>
        {config.id === 'bookings' && (
          <>
            <button type="button" onClick={() => confirmDownPayment(record)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-gray-300">
              Confirm Down Payment
            </button>
            <button type="button" onClick={() => viewPayments(record)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-gray-300">
              Payment history
            </button>
          </>
        )}
        {config.id === 'registered_agents' && (
          <>
            <button type="button" onClick={() => viewGuestLogs(record)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-gray-300">
              View Guest Logs
            </button>
            <button
              type="button"
              onClick={() => void setAgentStatus(record, agentIsActive(record) ? 'Inactive' : 'Active')}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-gray-300"
            >
              {agentIsActive(record) ? 'Deactivate' : 'Activate'}
            </button>
          </>
        )}
      </>
    );
  }

  function openCreate() {
    if (isTours) {
      router.push('/admin/tours/new');
      return;
    }
    if (isSafariUpdates) {
      router.push('/admin/safari_updates/new');
      return;
    }
    if (isCountries) {
      router.push('/admin/countries/new');
      return;
    }
    if (isCategories) {
      router.push('/admin/categories/new');
      return;
    }
    if (isNationalPark) {
      router.push('/admin/national_park/new');
      return;
    }
    if (isAccommodations) {
      router.push('/admin/accommodations/new');
      return;
    }
    if (isExplore) {
      router.push('/admin/explore/new');
      return;
    }
    if (isPages) {
      router.push('/admin/pages/new');
      return;
    }
    if (isLandingPages) {
      router.push('/admin/landing_pages/new');
      return;
    }
    if (config.id === 'registered_agents') return;
    setEditing(null);
    const defaults: Record<string, string> = {};
    config.fields.forEach((field) => {
      defaults[field.name] = '';
    });
    setForm(defaults);
    setSeo(defaultSeoValues());
    setSeoSaved(false);
    setFaqs([]);
    setModalOpen(true);
  }

  async function viewNotification(record: RecordRow) {
    setViewingNotice(record);
    const id = pickRecordId(record);
    if (id == null || !isUnreadNotification(record)) return;
    await saveWithColumnFallback('notifications', markNotificationReadPayload(), id);
    notifyAdminNotificationsChanged();
    setRecords((current) =>
      current.map((row) => (pickRecordId(row) === id ? { ...row, ...markNotificationReadPayload() } : row))
    );
  }

  function openEdit(record: RecordRow) {
    if (isNotifications) {
      void viewNotification(record);
      return;
    }
    const recordId = pickRecordId(record);
    if (recordId != null) {
      if (isTours) {
        router.push(`/admin/tours/${recordId}/edit`);
        return;
      }
      if (isSafariUpdates) {
        router.push(`/admin/safari_updates/${recordId}/edit`);
        return;
      }
      if (isCountries) {
        router.push(`/admin/countries/${recordId}/edit`);
        return;
      }
      if (isCategories) {
        router.push(`/admin/categories/${recordId}/edit`);
        return;
      }
      if (isNationalPark) {
        router.push(`/admin/national_park/${recordId}/edit`);
        return;
      }
      if (isAccommodations) {
        router.push(`/admin/accommodations/${recordId}/edit`);
        return;
      }
      if (isExplore) {
        router.push(`/admin/explore/${recordId}/edit`);
        return;
      }
      if (isPages) {
        router.push(`/admin/pages/${recordId}/edit`);
        return;
      }
      if (isLandingPages) {
        router.push(`/admin/landing_pages/${recordId}/edit`);
        return;
      }
    }
    setEditing(record);
    const next: Record<string, string> = {};
    const keys = config.fields.length > 0 ? config.fields.map((field) => field.name) : Object.keys(record);
    keys.forEach((key) => {
      const value = record[key];
      const text = value === null || value === undefined ? '' : String(value);
      next[key] = /description|content|summary|excerpt/i.test(key) ? stripEmbeddedContent(text) : text;
    });
    setForm(next);
    setSeo(seoValuesFromRecord(record as Record<string, unknown>));
    setSeoSaved(true);
    setFaqs(faqsForEditor(record, config.id));
    if (isCountries && !next.best_time_to_visit) {
      next.best_time_to_visit = parseCmsPageExtras(record, String(record.slug || '')).best_time_to_visit;
      setForm({ ...next });
    }
    setModalOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const raw: Record<string, unknown> = { ...form };
    // Categories: always derive the public slug from the current name (not a previous rename).
    if (config.id === 'categories' && typeof raw.name === 'string' && String(raw.name).trim()) {
      raw.slug = slugify(String(raw.name));
    } else {
      if (!raw.slug && typeof raw.title === 'string') raw.slug = slugify(raw.title as string);
      if (!raw.slug && typeof raw.name === 'string') raw.slug = slugify(raw.name as string);
    }

    const table = config.table;
    const previousHtml = String(editing?.description || editing?.content || '');
    const previousEmbed = extractEmbeddedContent(previousHtml);
    const packedFaqs = usesFaqs ? serializeFaqs(faqs) : '';
    if (usesFaqs) {
      raw.faqs = packedFaqs;
      raw.post_blocks = packedFaqs;
    }
    const bestTime = isCountries ? String(raw.best_time_to_visit || '').trim() : '';
    const publishStamp = publishStampForSave(
      String(raw.published_at || '') || recordPublishedAt(editing) || '',
      Boolean(editing?.id)
    );
    raw.published_at = publishStamp;
    const embedData = usesFaqs
      ? {
          ...previousEmbed,
          fields: {
            ...previousEmbed.fields,
            faqs: packedFaqs,
            published_at: publishStamp,
            ...(isCountries ? { best_time_to_visit: bestTime } : {}),
          },
        }
      : {
          ...previousEmbed,
          fields: {
            ...previousEmbed.fields,
            published_at: publishStamp,
          },
        };
    if (typeof raw.description === 'string') {
      raw.description = embedContent(String(raw.description), embedData);
    }
    if (typeof raw.content === 'string') {
      raw.content = embedContent(String(raw.content), embedData);
    }
    const payload = buildSavePayload(table, raw, { seo, knownColumns: columns });
    const result = await saveWithColumnFallback(table, payload, editing?.id);

    if (result.error) {
      console.error('[Supabase] Save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: config.label,
      action: editing?.id ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: editing?.id || result.data?.[0]?.id },
    });

    if (table === 'bookings') {
      const status = String(raw.status || '');
      const guestEmail = String(raw.email || '');
      const guestName = String(raw.guest_name || guestEmail);
      const event = bookingCalendarEvent({
        guestName,
        tour: String(raw.tour || ''),
        destination: String(raw.destination || ''),
        travelDate: String(raw.travel_date || ''),
        email: guestEmail,
      });
      const calendarUrl = googleCalendarUrl(event);
      if (!editing) {
        await notifyWorkspace({
          title: 'New Booking',
          message: `${guestName} booked ${String(raw.tour || 'a safari')}. Add to calendar: ${calendarUrl}`,
          category: 'booking',
          guestEmail: guestEmail || undefined,
        });
      }
      if (['Confirmed', 'Completed', 'Cancelled'].includes(status) && guestEmail) {
        await notifyWorkspace({
          title: `Booking ${status}`,
          message: `Booking for ${guestName} is now ${status}. Calendar: ${calendarUrl}`,
          category: 'booking',
          guestEmail,
          sendToGuest: true,
        });
      }
    }

    setModalOpen(false);
    setSaving(false);
    await load();
    router.refresh();
  }

  async function remove(record: RecordRow) {
    if (!record.id || !confirm('Delete this record?')) return;
    const { error: deleteError } = await supabase.from(config.table).delete().eq('id', record.id);
    if (deleteError) {
      console.error(deleteError);
      setError(deleteError.message);
      return;
    }
    await publishPublicSite();
    if (isNotifications) notifyAdminNotificationsChanged();
    await load();
  }

  async function setAgentStatus(record: RecordRow, status: 'Active' | 'Inactive' | 'Pending') {
    const id = pickRecordId(record);
    const email = pickString(record, ['email', 'Email', 'agent_email']).trim();
    if (id == null && !email.includes('@')) {
      setActionError('This agent has no id or email, so it cannot be activated. Open the row, add an email, then try Activate again.');
      return;
    }
    setActionError('');
    const response = await fetch('/api/admin/agents/status', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({
        id: id ?? undefined,
        status,
        email,
        name: pickString(record, ['name', 'full_name', 'Name']),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setActionError(body.error || 'Could not update the agent status.');
      return;
    }
    await load();
  }

  async function viewGuestLogs(record: RecordRow) {
    setGuestLogsAgent(record);
    setGuestLogs([]);
    setGuestLogsLoading(true);
    setActionError('');
    const email = pickString(record, ['email', 'Email', 'agent_email']);
    if (!email) {
      setGuestLogsLoading(false);
      return;
    }
    try {
      setGuestLogs(await fetchBookingsForAgent(email));
    } catch (logsError) {
      console.error(logsError);
      setActionError(logsError instanceof Error ? logsError.message : 'Could not load guest logs.');
    }
    setGuestLogsLoading(false);
  }

  async function confirmGuest(guest: RecordRow) {
    if (!guest.id) return;
    const guestEmail = pickString(guest, ['email']);
    const guestName = pickString(guest, ['guest_name', 'name']) || guestEmail;
    const code = pickString(guest, ['booking_code']) || generateBookingCode();
    const { error: updateError } = await saveWithColumnFallback(
      'bookings',
      { status: 'Confirmed', booking_code: code },
      guest.id
    );
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setGuestLogs((current) =>
      current.map((row) => (row.id === guest.id ? { ...row, status: 'Confirmed', booking_code: code } : row))
    );
    if (guestEmail) {
      await notifyWorkspace({
        title: 'Booking Confirmed',
        message: `Hi ${guestName}, your safari booking is confirmed. Your booking code is ${code}. Verify anytime at ${SITE.url}/verify`,
        category: 'booking',
        guestEmail,
        sendToGuest: true,
      });
    }
  }

  async function confirmDownPayment(record: RecordRow) {
    if (!record.id) return;
    const entered = window.prompt('Amount paid');
    if (!entered) return;
    const paid = Number(entered);
    if (!Number.isFinite(paid) || paid <= 0) {
      setError('Enter a valid amount paid.');
      return;
    }
    const total = pickNumber(record, ['final_tour_price', 'total_price', 'amount'], 0);
    if (total <= 0) {
      setError('Set the Final Tour Fee on this booking first (from the quotation).');
      return;
    }
    const existingPaid = pickNumber(record, ['amount_paid'], 0);
    const newPaid = existingPaid + paid;
    if (newPaid > total + 0.01) {
      setError('Amount cannot exceed the remaining balance on this booking.');
      return;
    }
    const remaining = Math.max(0, Number((total - newPaid).toFixed(2)));
    const code = pickString(record, ['booking_code']) || generateBookingCode();
    const paymentStatus = paymentStatusAfterAmount(total, newPaid);
    const bookingStatus = bookingStatusAfterPayment(
      total,
      newPaid,
      normalizeBookingStatus(pickString(record, ['status']))
    );
    const { error: updateError } = await saveWithColumnFallback(
      'bookings',
      {
        amount_paid: newPaid,
        remaining_balance: remaining,
        final_tour_price: total,
        booking_code: code,
        payment_status: paymentStatus,
        status: bookingStatus,
      },
      record.id
    );
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const guestEmail = pickString(record, ['email']);
    if (guestEmail.includes('@')) {
      const notice = guestPaymentNotice({
        guestName: pickString(record, ['guest_name', 'name']),
        tour: pickString(record, ['tour']),
        finalTourFee: total,
        amountJustPaid: paid,
        totalPaid: newPaid,
        remainingBalance: remaining,
        bookingCode: code,
        paymentLink: `${SITE.url}/payment?booking=${record.id}`,
        verifyUrl: `${SITE.url}/verify`,
        siteName: SITE.name,
      });
      await notifyWorkspace({
        title: notice.adminTitle,
        message: notice.adminMessage,
        category: 'booking',
        guestEmail,
        sendToGuest: true,
        guestTitle: notice.guestTitle,
        guestMessage: notice.guestMessage,
      });
    }
    await load();
  }

  async function viewPayments(record: RecordRow) {
    setPaymentHistoryBooking(record);
    setPaymentHistory([]);
    if (!record.id) return;
    const { data, error: paymentsError } = await supabase.from('pesapal_payments').select('*').eq('booking_id', record.id);
    if (paymentsError || !(data || []).length) {
      const email = pickString(record, ['email']);
      if (email) {
        const fallback = await supabase.from('pesapal_payments').select('*').eq('email', email);
        setPaymentHistory((fallback.data as RecordRow[]) || []);
        return;
      }
    }
    setPaymentHistory((data as RecordRow[]) || []);
  }

  const fields: FormField[] =
    config.fields.length > 0
      ? config.fields.filter((field) => field.name !== 'slug')
      : columns
          .filter((column) => column !== 'id' && column !== 'slug')
          .map((column) => ({
            name: column,
            label: formatColumnLabel(column),
            type: 'text',
          }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#111827] dark:text-white">{config.label}</h2>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-gray-400">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {isNotifications && (
            <span className="relative inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              <Bell className="h-3.5 w-3.5" />
              {records.filter(isUnreadNotification).length} unread
            </span>
          )}
          {['bookings', 'inquiries', 'quotations_inquiries', 'pesapal_payments', 'registered_agents'].includes(config.id) && (
            <span className="relative inline-flex items-center gap-1 rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
              <Bell className="h-3.5 w-3.5" />
              {records.filter((row) => pickString(row, ['status']).toLowerCase() === 'pending').length} pending
            </span>
          )}
          <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
            {isTours
              ? countryFilter
                ? `${listTotal.toLocaleString()} tours in ${countryFilter}`
                : `${listTotal.toLocaleString()} Total Packages`
              : isNationalPark
                ? countryFilter
                  ? `${listTotal.toLocaleString()} parks in ${countryFilter}`
                  : `${listTotal.toLocaleString()} national parks`
              : isAccommodations
                ? parkFilter
                  ? `${listTotal.toLocaleString()} stays in ${parkFilter}`
                  : countryFilter
                    ? `${listTotal.toLocaleString()} stays in ${countryFilter}`
                    : `${listTotal.toLocaleString()} accommodations`
                : countryFilter
                  ? `${listTotal.toLocaleString()} of ${records.length.toLocaleString()} records`
                  : `${listTotal.toLocaleString()} records`}
          </span>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {config.addLabel && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00945a]"
            >
              <Plus className="h-4 w-4" /> {config.addLabel}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-3 sm:flex-row dark:border-white/10 dark:bg-[#161b22]">
        {(isTours || isCountries || isNationalPark || isAccommodations || isExplore || isCategories || isLandingPages) && (
          <div className="w-full sm:w-56">
            <SearchableSelect
              value={countryFilter}
              onChange={(value) => {
                setCountryFilter(value);
                setCategoryFilter('');
                setParkFilter('');
              }}
              options={[
                { value: '', label: 'All destinations' },
                ...countryOptions.map((country) => ({ value: country, label: country })),
              ]}
              placeholder="All destinations"
            />
          </div>
        )}
        {isAccommodations && (
          <div className="w-full sm:w-72">
            <SearchableSelect
              value={parkFilter}
              onChange={setParkFilter}
              disabled={!countryFilter}
              options={[
                { value: '', label: countryFilter ? 'All parks in this country' : 'Select a country first' },
                ...parkOptions.map((park) => ({ value: park, label: park })),
              ]}
              placeholder={countryFilter ? 'National park' : 'Select a country first'}
            />
          </div>
        )}
        {isTours && (
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: 'All categories' },
                ...categoryOptions.map((category) => ({ value: category, label: category })),
              ]}
              placeholder="All categories"
            />
          </div>
        )}
        {isSafariUpdates && (
          <div className="w-full sm:w-52">
            <SearchableSelect
              value={postKind}
              onChange={(value) => setPostKind(value === 'language' ? 'language' : 'standard')}
              options={[
                { value: 'standard', label: 'Standard Posts' },
                { value: 'language', label: 'Language Posts' },
              ]}
              placeholder="Post type"
            />
          </div>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${config.label.toLowerCase()}...`}
            className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#00A651] dark:border-white/10 dark:bg-[#0a0c10] dark:text-white"
          />
        </div>
        {!isOps && (
          <div className="flex rounded-xl border border-gray-200 p-1 dark:border-white/10">
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`rounded-lg p-2 ${view === 'grid' ? 'bg-[#00A651]/15 text-[#00A651]' : 'text-gray-500 dark:text-gray-400'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="List view"
              className={`rounded-lg p-2 ${view === 'list' ? 'bg-[#00A651]/15 text-[#00A651]' : 'text-gray-500 dark:text-gray-400'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {actionError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <AdminLogoLoader label={`Loading ${config.label}`} />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Unable to load {config.label}</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-gray-600 dark:border-white/10 dark:bg-[#161b22] dark:text-gray-400">
          No records found in this collection.
        </div>
      ) : isOps ? (
        <OpsRecordTable
          columns={opsColumns()}
          records={filtered}
          extraActions={opsActions}
          onEdit={isNotifications ? undefined : openEdit}
          onView={isNotifications ? (record) => void viewNotification(record) : undefined}
          onDelete={remove}
        />
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {paged.map((record, index) => (
                <AdminItemCard
                  key={String(record.id ?? index)}
                  layout="grid"
                  href={publicHref(record)}
                  image={getRecordImage(record) || undefined}
                  badge={cardBadge()}
                  date={cardDate(record)}
                  title={getRecordTitle(record)}
                  onEdit={() => openEdit(record)}
                  onDelete={() => remove(record)}
                  extraActions={cardActions(record)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paged.map((record, index) => (
                <AdminItemCard
                  key={String(record.id ?? index)}
                  layout="list"
                  href={publicHref(record)}
                  image={getRecordImage(record) || undefined}
                  badge={cardBadge()}
                  date={cardDate(record)}
                  title={getRecordTitle(record)}
                  onEdit={() => openEdit(record)}
                  onDelete={() => remove(record)}
                  extraActions={cardActions(record)}
                />
              ))}
            </div>
          )}
          {totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-[#161b22]">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, listTotal)} of {listTotal.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
                >
                  Previous
                </button>
                <span className="text-gray-700 dark:text-gray-300">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <form id={`collection-form-${config.id}`} onSubmit={save} className="w-full max-w-6xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22] sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl dark:text-white">{editing ? 'Edit item' : config.addLabel || 'Add item'}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><X /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.filter((field) => field.name !== 'slug').map((field) => {
                const isImage = field.name === 'image_url' || /image|cover|photo/i.test(field.name);
                const isRich = field.type === 'textarea' && /description|content|excerpt|message|summary/i.test(field.name);
                return (
                  <div
                    key={field.name}
                    className={`text-sm font-medium text-gray-700 ${field.type === 'textarea' || isImage ? 'sm:col-span-2' : ''}`}
                  >
                    {isImage ? (
                      <CoverImageField
                        label={field.label}
                        folder={config.table || 'uploads'}
                        value={form[field.name] || ''}
                        onChange={(url) => {
                          setForm({ ...form, [field.name]: url, image_url: url });
                          setSeo((current) => ({ ...current, social_image_url: url }));
                        }}
                      />
                    ) : isRich ? (
                      <>
                        <span className="mb-2 block">{field.label}</span>
                        <RichTextEditor
                          value={form[field.name] || ''}
                          onChange={(value) => setForm({ ...form, [field.name]: value })}
                          placeholder={field.placeholder || 'Type here...'}
                          faqs={usesFaqs && /description|content/i.test(field.name) ? faqs : undefined}
                          onFaqsChange={
                            usesFaqs && /description|content/i.test(field.name) ? setFaqs : undefined
                          }
                          faqTitle={
                            isCountries
                              ? 'Country FAQ'
                              : isCategories
                                ? 'Category FAQ'
                                : isLandingPages
                                  ? 'Landing FAQ'
                                  : 'Page FAQ'
                          }
                          faqDescription="These are the same FAQs shown on the public page. Edit them here — they stay on the website."
                        />
                      </>
                    ) : field.type === 'textarea' ? (
                      <label className="block">
                        {field.label}
                        <textarea
                          required={field.required}
                          value={form[field.name] || ''}
                          onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                          className="mt-1 h-28 w-full rounded-lg border px-3 py-2 focus:border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </label>
                    ) : field.type === 'select' ? (
                      <label className="block">
                        {field.label}
                        <div className="mt-1">
                          <SearchableSelect
                            value={form[field.name] || ''}
                            onChange={(value) => setForm({ ...form, [field.name]: value })}
                            options={(field.options || []).map((option) => ({ value: option, label: option }))}
                            placeholder={`Select ${field.label}`}
                          />
                        </div>
                      </label>
                    ) : (
                      <label className="block">
                        {field.label}
                        <input
                          type={field.type}
                          required={field.required}
                          placeholder={field.placeholder}
                          value={form[field.name] || ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm({ ...form, [field.name]: value });
                            if (field.name === 'slug') setSeo({ ...seo, slug: value });
                            if (field.name === 'title' && !seo.seo_title) {
                              setSeo({ ...seo, seo_title: value });
                            }
                          }}
                          className="mt-1 w-full rounded-lg border px-3 py-2 focus:border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {config.publicPath ? (
              <SeoPanel
                className="mt-6"
                values={seo}
                onChange={setSeo}
                pageTitle={String(form.title || form.name || 'Untitled')}
                coverImageUrl={String(form.image_url || form.cover_image || form.featured_image || form.image || '')}
                contentForReadability={form.description || form.content || form.excerpt || ''}
                onSave={() => setSeoSaved(true)}
                saving={saving}
                contentType={
                  config.id === 'tours'
                    ? 'tour'
                    : config.id === 'countries'
                      ? 'country'
                      : config.id === 'categories'
                        ? 'category'
                        : config.id === 'national_park'
                          ? 'park'
                          : config.id === 'accommodations'
                            ? 'stay'
                            : config.id === 'explore'
                              ? 'place'
                              : config.id === 'safari_updates'
                                ? 'article'
                                : 'page'
                }
              />
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#00A651] px-5 py-2.5 font-semibold text-white hover:bg-[#00945a] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {guestLogsAgent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl">
                Guest logs · {getRecordTitle(guestLogsAgent) || pickString(guestLogsAgent, ['email'])}
              </h3>
              <button type="button" onClick={() => setGuestLogsAgent(null)} aria-label="Close guest logs">
                <X />
              </button>
            </div>
            {guestLogsLoading ? (
              <p className="text-sm text-gray-500">Loading guest records…</p>
            ) : guestLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No guests recorded by this agent yet.</p>
            ) : (
              <div className="space-y-3">
                {guestLogs.map((guest, index) => (
                  <article key={String(guest.id ?? index)} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                    <p className="font-semibold">{pickString(guest, ['guest_name', 'name']) || pickString(guest, ['email'])}</p>
                    <p className="text-gray-500">{pickString(guest, ['email'])}</p>
                    <p className="mt-1 text-gray-600">
                      {pickString(guest, ['tour']) || 'Tour not set'} · {pickString(guest, ['destination'])} ·{' '}
                      {pickString(guest, ['status']) || 'Pending'}
                    </p>
                    {pickString(guest, ['travel_date', 'created_at']) && (
                      <p className="mt-1 text-xs text-gray-400">
                        {pickString(guest, ['travel_date', 'created_at']).slice(0, 10)}
                      </p>
                    )}
                    {pickString(guest, ['status']).toLowerCase() !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => confirmGuest(guest)}
                        className="mt-3 rounded-md bg-moss px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Confirm Guest
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {paymentHistoryBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl">
                Payment history · {pickString(paymentHistoryBooking, ['guest_name', 'email'])}
              </h3>
              <button type="button" onClick={() => setPaymentHistoryBooking(null)} aria-label="Close payment history">
                <X />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {pickString(paymentHistoryBooking, ['payment_status']) || 'Pending Booking'} · Paid{' '}
              {pickNumber(paymentHistoryBooking, ['amount_paid'])} · Remaining{' '}
              {pickNumber(paymentHistoryBooking, ['remaining_balance'])}
            </p>
            {paymentHistory.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No Pesapal payments linked to this booking yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {paymentHistory.map((payment, index) => (
                  <article key={String(payment.id ?? index)} className="rounded-lg border px-4 py-3 text-sm">
                    <p className="font-semibold">{pickString(payment, ['reference'])}</p>
                    <p className="text-gray-500">
                      {pickString(payment, ['currency']) || 'USD'} {pickNumber(payment, ['pesapal_amount', 'amount'])} ·{' '}
                      {pickString(payment, ['status']) || 'Pending'}
                    </p>
                    {pickString(payment, ['order_tracking_id']) && (
                      <p className="text-xs text-gray-400">Tracking: {pickString(payment, ['order_tracking_id'])}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {viewingNotice ? (
        <NotificationDetailModal record={viewingNotice} onClose={() => setViewingNotice(null)} />
      ) : null}
    </div>
  );
}
