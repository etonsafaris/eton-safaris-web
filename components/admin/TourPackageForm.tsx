'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useAdminCollectionListHref } from '@/lib/use-admin-list-href';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Mountain,
  SquarePen,
  Trash2,
} from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SearchableSelect from '@/components/admin/SearchableSelect';
import SeoPanel from '@/components/admin/SeoPanel';
import CoverImageField from '@/components/admin/CoverImageField';
import {
  defaultSeoValues,
  seoValuesFromRecord,
  type SeoValues,
} from '@/lib/seo';
import { buildSavePayload } from '@/lib/supabase-payload';
import { hasAdminEditPrefill, readAdminEditPrefill } from '@/lib/admin-edit-prefill';
import { fetchAdminRecordById, fetchAdminTablePage, saveWithColumnFallback } from '@/lib/admin-records-client';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import { getRecordTitle, publishStampForSave, recordPublishedAt, slugify } from '@/lib/data';
import { publicCountryLabel } from '@/lib/country-utils';
import { adjustEditingIndexAfterMove, moveArrayItem } from '@/lib/reorder';
import { embedContent, extractEmbeddedContent, stripEmbeddedContent } from '@/lib/embedded-content';
import { parseItinerariesFromRecord } from '@/lib/itinerary';
import { faqsForEditor } from '@/lib/default-faqs';
import { serializeFaqs, type PageFaq } from '@/lib/cms-page-model';
import type { RecordRow } from '@/lib/types';

type ItineraryEntry = {
  day: string;
  title: string;
  description: string;
  mealPlan: string;
  accommodationPlan: string;
};

type TourFormState = {
  title: string;
  description: string;
  highlights: string;
  image_url: string;
  country: string;
  category: string;
  duration_days: string;
  price: string;
  price_includes: string;
  price_excludes: string;
  journey_details: string;
  journey_map_url: string;
  featured: boolean;
  slug: string;
};

const DEFAULT_FORM: TourFormState = {
  title: '',
  description: '',
  highlights: '',
  image_url: '',
  country: '',
  category: '',
  duration_days: '',
  price: '',
  price_includes: '',
  price_excludes: '',
  journey_details: '',
  journey_map_url: '',
  featured: true,
  slug: '',
};

function tourFormFromListRow(tour: RecordRow): TourFormState {
  return {
    ...DEFAULT_FORM,
    title: String(tour.title || tour.name || ''),
    description: stripEmbeddedContent(String(tour.description || tour.content || '')),
    image_url: String(tour.image_url || tour.cover_image || tour.social_image_url || ''),
    country: String(tour.country || ''),
    category: String(tour.category || tour.category_name || ''),
    duration_days: String(tour.duration_days ?? tour.duration ?? ''),
    price: String(tour.price ?? ''),
    slug: String(tour.slug || tour.seo_slug || ''),
    featured: tour.featured !== false && tour.is_featured !== false,
  };
}

const EMPTY_ITINERARY: ItineraryEntry = {
  day: '',
  title: '',
  description: '',
  mealPlan: '',
  accommodationPlan: '',
};

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A651] text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-bold text-[#111827] dark:text-white">{title}</h2>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-[#374151] dark:text-gray-200">{children}</label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white dark:placeholder:text-gray-500 ${className}`}
    />
  );
}

function SelectField({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

type TourPackageFormProps = {
  tourId?: string;
};

export default function TourPackageForm(props: TourPackageFormProps) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading form…</p>}>
      <TourPackageFormInner {...props} />
    </Suspense>
  );
}

function TourPackageFormInner({ tourId }: TourPackageFormProps) {
  const listHref = useAdminCollectionListHref('tours');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = Boolean(tourId);
  const [form, setForm] = useState<TourFormState>(() => {
    if (!tourId) return DEFAULT_FORM;
    const prefill = readAdminEditPrefill('tours', tourId);
    return prefill ? tourFormFromListRow(prefill) : DEFAULT_FORM;
  });
  const [itineraries, setItineraries] = useState<ItineraryEntry[]>([]);
  const [draftItinerary, setDraftItinerary] = useState<ItineraryEntry>(EMPTY_ITINERARY);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [countries, setCountries] = useState<RecordRow[]>([]);
  const [categories, setCategories] = useState<RecordRow[]>([]);
  const [seo, setSeo] = useState<SeoValues>(() => {
    if (!tourId) return defaultSeoValues('tour');
    const prefill = readAdminEditPrefill('tours', tourId);
    return prefill ? seoValuesFromRecord(prefill as Record<string, unknown>) : defaultSeoValues('tour');
  });
  const [schemaColumns, setSchemaColumns] = useState<string[] | undefined>();
  const [saving, setSaving] = useState(false);
  const [seoSaved, setSeoSaved] = useState(isEdit);
  const [error, setError] = useState('');
  const [loadingTour, setLoadingTour] = useState(
    () => Boolean(tourId) && !hasAdminEditPrefill('tours', tourId!)
  );
  const [publishedAt, setPublishedAt] = useState(() => {
    if (!tourId) return '';
    const prefill = readAdminEditPrefill('tours', tourId);
    return prefill ? recordPublishedAt(prefill) : '';
  });
  const [faqs, setFaqs] = useState<PageFaq[]>([]);

  useEffect(() => {
    fetchAdminTablePage('countries', { page: 1, limit: 50 }).then((countryPage) => {
      setCountries(countryPage.rows);
    });
  }, []);

  useEffect(() => {
    if (tourId) return;
    const presetCountry = searchParams?.get('country')?.trim();
    const presetCategory = searchParams?.get('category')?.trim();
    if (!presetCountry) return;
    setForm((current) => ({
      ...current,
      country: current.country || presetCountry,
      category: current.category || presetCategory || '',
    }));
  }, [tourId, searchParams]);

  useEffect(() => {
    const country = form.country.trim();
    if (!country) {
      setCategories([]);
      return;
    }
    fetchAdminTablePage('categories', { page: 1, limit: 50, country })
      .then((page) => setCategories(page.rows))
      .catch(() => setCategories([]));
  }, [form.country]);

  useEffect(() => {
    if (!tourId) return;
    let active = true;
    const hadPrefill = hasAdminEditPrefill('tours', tourId);
    if (!hadPrefill) setLoadingTour(true);
    setError('');
    void fetchAdminRecordById('tours', tourId).then((tour) => {
      if (!active) return;
      setLoadingTour(false);
      if (!tour) {
        setError('Could not load this tour. Go back to the list and try Edit again.');
        return;
      }
      setSchemaColumns(Object.keys(tour));
      const embedded = extractEmbeddedContent(String(tour.description || tour.content || ''));
      setPublishedAt(recordPublishedAt(tour));
      setForm({
        title: String(tour.title || tour.name || ''),
        description: stripEmbeddedContent(String(tour.description || tour.content || '')),
        highlights: String(tour.highlights || embedded.fields?.highlights || ''),
        image_url: String(tour.image_url || tour.cover_image || ''),
        country: String(tour.country || ''),
        category: String(tour.category || tour.category_name || ''),
        duration_days: String(tour.duration_days ?? tour.duration ?? ''),
        price: String(tour.price ?? ''),
        price_includes: String(tour.price_includes || embedded.fields?.price_includes || ''),
        price_excludes: String(tour.price_excludes || embedded.fields?.price_excludes || ''),
        journey_details: String(tour.journey_details || embedded.fields?.journey_details || ''),
        journey_map_url: String(tour.journey_map_url || embedded.fields?.journey_map_url || ''),
        featured: tour.featured !== false && tour.is_featured !== false,
        slug: String(tour.slug || tour.seo_slug || ''),
      });
      setSeo(seoValuesFromRecord(tour as Record<string, unknown>));
      setFaqs(faqsForEditor(tour, 'tours'));
      try {
        const days = parseItinerariesFromRecord(tour);
        setItineraries(
          days.map((entry, index) => ({
            day: String(entry.day || index + 1),
            title: String(entry.title || ''),
            description: String(entry.description || ''),
            mealPlan: String(entry.mealPlan || entry.meal_plan || ''),
            accommodationPlan: String(entry.accommodationPlan || entry.accommodation_plan || ''),
          }))
        );
      } catch {
        setItineraries([]);
      }
    });
    return () => {
      active = false;
    };
  }, [tourId]);

  useEffect(() => {
    if (tourId) return;
    setFaqs(
      faqsForEditor(
        {
          title: form.title,
          country: form.country,
          category: form.category,
          slug: form.slug,
        } as RecordRow,
        'tours'
      )
    );
  }, [tourId, form.country, form.category]);

  const countryOptions = useMemo(
    () =>
      countries.map((country) => {
        const label = publicCountryLabel(country);
        return { value: label, label };
      }),
    [countries]
  );

  const categoryOptions = useMemo(() => {
    if (!form.country) return [];
    return categories
      .filter((category) => {
        const countryValue = String(category.country || '');
        return !countryValue || countryValue.toLowerCase() === form.country.toLowerCase();
      })
      .map((category) => ({
        value: getRecordTitle(category),
        label: getRecordTitle(category),
      }));
  }, [categories, form.country]);

  function updateField<K extends keyof TourFormState>(key: K, value: TourFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addItinerary() {
    if (!draftItinerary.title.trim() && !draftItinerary.description.trim()) return;
    setItineraries((current) => {
      if (editingDay !== null) {
        return current.map((entry, index) =>
          index === editingDay ? { ...draftItinerary, day: String(index + 1) } : { ...entry, day: String(index + 1) }
        );
      }
      // Always append so the first day entered stays Day 1 on admin and the public site.
      return [...current, { ...draftItinerary, day: String(current.length + 1) }].map((entry, index) => ({
        ...entry,
        day: String(index + 1),
      }));
    });
    setDraftItinerary(EMPTY_ITINERARY);
    setEditingDay(null);
  }

  function editDay(index: number) {
    const entry = itineraries[index];
    if (!entry) return;
    setDraftItinerary(entry);
    setEditingDay(index);
  }

  function deleteDay(index: number) {
    setItineraries((current) =>
      current.filter((_, itemIndex) => itemIndex !== index).map((entry, itemIndex) => ({
        ...entry,
        day: String(itemIndex + 1),
      }))
    );
    if (editingDay === index) {
      setDraftItinerary(EMPTY_ITINERARY);
      setEditingDay(null);
    } else if (editingDay !== null && editingDay > index) {
      setEditingDay(editingDay - 1);
    }
  }

  function moveDay(index: number, direction: -1 | 1) {
    setItineraries((current) =>
      moveArrayItem(current, index, direction).map((entry, itemIndex) => ({
        ...entry,
        day: String(itemIndex + 1),
      }))
    );
    setEditingDay((current) => adjustEditingIndexAfterMove(current, index, direction));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const stamp = publishStampForSave(publishedAt, isEdit);
    const tourSlug = slugify(seo.slug || form.slug || form.title);
    const payload = buildSavePayload(
      'tours',
      {
        ...form,
        description: embedContent(form.description, {
          itineraries,
          fields: {
            journey_details: form.journey_details,
            journey_map_url: form.journey_map_url,
            highlights: form.highlights,
            price_includes: form.price_includes,
            price_excludes: form.price_excludes,
            faqs: serializeFaqs(faqs),
            ...(stamp ? { published_at: stamp } : {}),
          },
        }),
        duration_days: form.duration_days ? Number(form.duration_days) : null,
        slug: tourSlug,
        itinerary: JSON.stringify(itineraries),
        itineraries: JSON.stringify(itineraries),
        group_size: 'Flexible',
        published_at: stamp,
      },
      {
        seo: { ...seo, slug: tourSlug || seo.slug },
        knownColumns: schemaColumns,
      }
    );

    const result = await saveWithColumnFallback('tours', payload, isEdit ? tourId : undefined);

    if (result.error) {
      console.error('[Supabase] Tour save failed:', result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await notifyAdminItemSaved({
      module: 'Tour Package',
      action: isEdit ? 'updated' : 'created',
      item: { ...payload, ...(result.data?.[0] || {}), id: isEdit ? tourId : result.data?.[0]?.id },
    });

    router.push(listHref);
  }

  return (
    <form id="tour-package-form" onSubmit={handleSubmit} className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm text-[#6b7280] transition hover:text-[#111827] dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tours
      </Link>

      <div className="mt-4">
        <h1 className="font-serif text-3xl font-bold text-[#111827] dark:text-white">
          {isEdit ? 'Edit Tour Package' : 'Create New Tour Package'}
        </h1>
        <p className="mt-1 text-sm text-[#6b7280] dark:text-gray-400">
          {isEdit
            ? 'Update the saved tour details below, then click Save.'
            : 'Fill in the details below to add a new safari experience.'}
        </p>
      </div>

      {loadingTour ? <p className="mt-8 text-sm text-gray-500">Loading saved tour…</p> : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="mt-8 space-y-8 rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
        <section>
          <SectionHeader icon={FileText} title="Tour Overview" />
          <div className="space-y-4">
            <div>
              <FieldLabel>Tour Title</FieldLabel>
              <TextInput
                value={form.title}
                onChange={(value) => {
                  const nextSlug = slugify(value);
                  updateField('title', value);
                  updateField('slug', nextSlug);
                  setSeo((current) => ({
                    ...current,
                    seo_title: current.seo_title || value,
                    slug: nextSlug,
                  }));
                }}
                placeholder="e.g., Majestic Safari Adventure"
              />
            </div>
            <RichTextEditor
              value={form.description}
              onChange={(value) => updateField('description', value)}
              placeholder="Describe the experience..."
              showFooter
              faqs={faqs}
              onFaqsChange={setFaqs}
              faqTitle="Tour FAQ"
              faqDescription="These are the same FAQs shown on the public tour page. Edit them here — they stay on the website."
            />
          </div>
        </section>

        <section>
          <SectionHeader icon={Mountain} title="Highlights & Media" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <FieldLabel>Tour Highlights (List key activities, one per line)</FieldLabel>
              <textarea
                value={form.highlights}
                onChange={(event) => updateField('highlights', event.target.value)}
                rows={8}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <CoverImageField
              label="Cover Image"
              folder="tours"
              value={form.image_url}
              onChange={(url) => {
                updateField('image_url', url);
                setSeo((current) => ({ ...current, social_image_url: url }));
              }}
            />
          </div>
        </section>

        <section className="rounded-xl bg-[#f9fafb] p-6 dark:bg-white/5">
          <SectionHeader icon={BookOpen} title="Logistics" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>Country</FieldLabel>
              <SelectField
                value={form.country}
                onChange={(value) => {
                  updateField('country', value);
                  updateField('category', '');
                }}
                placeholder="Select Country"
                options={countryOptions}
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <SelectField
                value={form.category}
                onChange={(value) => updateField('category', value)}
                placeholder={form.country ? 'Please select category...' : 'Please select country...'}
                options={categoryOptions}
                disabled={!form.country}
              />
            </div>
            <div>
              <FieldLabel>Duration (Days)</FieldLabel>
              <TextInput
                value={form.duration_days}
                onChange={(value) => updateField('duration_days', value)}
                placeholder="e.g., 5"
                type="number"
              />
            </div>
            <div>
              <FieldLabel>Price</FieldLabel>
              <TextInput
                value={form.price}
                onChange={(value) => updateField('price', value)}
                placeholder="e.g., 1500"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={DollarSign} title="Pricing Details" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <FieldLabel>Price Includes</FieldLabel>
              <textarea
                value={form.price_includes}
                onChange={(event) => updateField('price_includes', event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#111827] outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white"
              />
            </div>
            <div>
              <FieldLabel>Price Excludes</FieldLabel>
              <textarea
                value={form.price_excludes}
                onChange={(event) => updateField('price_excludes', event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#111827] outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 dark:border-white/10 dark:bg-[#161b22] dark:text-white"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between border-b border-[#e5e7eb] pb-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A651] text-white">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white">Daily Itinerary</h2>
            </div>
          </div>

          {itineraries.length > 0 && (
            <div className="mb-8">
              <h3 className="font-serif text-2xl font-bold text-[#1e293b] dark:text-white">
                Itineraries ({itineraries.length})
              </h3>
              {itineraries.length > 1 ? (
                <p className="mt-1 text-sm text-[#6b7280] dark:text-gray-400">
                  Use the arrows to change day order — this order is what guests see on the public tour page.
                </p>
              ) : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {itineraries.map((entry, index) => (
                  <article
                    key={`${entry.day}-${index}`}
                    className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f1419]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00A651] text-[10px] font-bold text-white">
                        Day {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-serif text-base font-bold text-[#1e293b] dark:text-white">
                          {entry.title || `Day ${index + 1}`}
                        </h4>
                        {entry.description && (
                          <p className="mt-1 line-clamp-3 text-sm text-[#6b7280]">
                            {entry.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f3f4f6] pt-3 dark:border-white/10">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveDay(index, -1)}
                          className="rounded-md p-1.5 text-[#047857] hover:bg-[#ecfdf5] disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Move day ${index + 1} up`}
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index >= itineraries.length - 1}
                          onClick={() => moveDay(index, 1)}
                          className="rounded-md p-1.5 text-[#047857] hover:bg-[#ecfdf5] disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Move day ${index + 1} down`}
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => editDay(index)} className="rounded-md p-1.5 text-[#00A651] hover:bg-[#ecfdf5]" aria-label="Edit day">
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteDay(index)} className="rounded-md p-1.5 text-[#ef4444] hover:bg-red-50" aria-label="Delete day">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-4 text-sm font-bold text-[#111827] dark:text-white">
              {editingDay !== null ? `Edit Day ${editingDay + 1}` : `New Day ${itineraries.length + 1}`}
            </p>

            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00A651] text-[10px] font-bold text-white">
                Day {editingDay !== null ? editingDay + 1 : itineraries.length + 1}
              </span>
              <div className="flex-1">
                <FieldLabel>Day Title Info</FieldLabel>
                <TextInput
                  value={draftItinerary.title}
                  onChange={(value) => setDraftItinerary({ ...draftItinerary, title: value })}
                  placeholder="e.g., Transfer to Bwindi"
                />
              </div>
            </div>

            <FieldLabel>Day activities</FieldLabel>
            <RichTextEditor
              value={draftItinerary.description}
              onChange={(value) => setDraftItinerary({ ...draftItinerary, description: value })}
              placeholder="Type detailed daily activities..."
              minHeight={180}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Meal Plan</FieldLabel>
                <TextInput
                  value={draftItinerary.mealPlan}
                  onChange={(value) => setDraftItinerary({ ...draftItinerary, mealPlan: value })}
                />
              </div>
              <div>
                <FieldLabel>Accommodation Plan</FieldLabel>
                <TextInput
                  value={draftItinerary.accommodationPlan}
                  onChange={(value) =>
                    setDraftItinerary({ ...draftItinerary, accommodationPlan: value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addItinerary}
                className="inline-flex items-center gap-2 rounded-full bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00945a]"
              >
                <Check className="h-4 w-4" />
                {editingDay !== null ? 'Update Day' : 'Add Day'}
              </button>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader icon={BookOpen} title="Additional Options & Journey Map (Optional)" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
            Journey Details
          </p>
          <RichTextEditor
            value={form.journey_details}
            onChange={(value) => updateField('journey_details', value)}
            placeholder="Add journey details..."
            minHeight={160}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <CoverImageField
                label="Journey Map"
                folder="tours/maps"
                value={form.journey_map_url}
                onChange={(url) => updateField('journey_map_url', url)}
                previewClassName="h-40"
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#111827] dark:text-white">
                <span className="h-2 w-2 rounded-full bg-[#facc15]" />
                Featured Status
              </p>
              <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0f1419]">
                <span className="text-sm font-medium text-[#374151] dark:text-gray-200">Show on Landing Page</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.featured}
                  onClick={() => updateField('featured', !form.featured)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    form.featured ? 'bg-[#00A651]' : 'bg-[#d1d5db]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      form.featured ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href={listHref}
              className="rounded-full border border-[#c17f59] px-6 py-2.5 text-sm font-semibold text-[#c17f59] transition hover:bg-[#fff7ed]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#00A651] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00945a] disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Update Tour' : 'Create Tour'}
            </button>
          </div>
        </section>
      </div>

      <SeoPanel
        className="mt-6"
        values={seo}
        onChange={setSeo}
        pageTitle={form.title}
        contentForReadability={form.description}
        onSave={() => setSeoSaved(true)}
        saving={saving}
        coverImageUrl={form.image_url}
        contentType="tour"
        keywordLibraryCountry={form.country}
        keywordLibraryCategory={form.category}
        indexRecord={form as unknown as RecordRow}
      />
    </form>
  );
}
