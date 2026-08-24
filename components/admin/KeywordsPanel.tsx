'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import {
  chipsFromKeywordRows,
  keywordRowMatchesScope,
  savedKeywordSets,
  uniqueKeywords,
} from '@/lib/keywords';
import { clearCollectionCache, fetchCollectionRecords, pickString } from '@/lib/data';
import { mergePublicDestinations } from '@/lib/public-destinations';
import { saveWithColumnFallback } from '@/lib/supabase-save';
import { notifyAdminItemSaved } from '@/lib/admin-item-notify';
import type { RecordRow } from '@/lib/types';
import KeywordTagBox from '@/components/admin/KeywordTagBox';
import SavedBlocksGrid from '@/components/admin/SavedBlocksGrid';
import SearchableSelect from '@/components/admin/SearchableSelect';

const SEEDED_COUNTRIES = [
  ...NAV_COUNTRIES.map((item) => item.name),
  ...OTHER_DESTINATIONS.map((item) => item.name),
];

export default function KeywordsPanel() {
  const [country, setCountry] = useState('Uganda');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<RecordRow[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>(SEEDED_COUNTRIES);
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const skipResetRef = useRef(false);

  async function load() {
    try {
      clearCollectionCache('keywords');
      const data = await fetchCollectionRecords('keywords', ['keyword', 'seo_keywords']);
      setRows(data);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load keywords';
      setError(message);
      setRows([]);
    }
  }

  useEffect(() => {
    load();
    fetchCollectionRecords('categories').then(setCategories).catch((loadError) => console.error(loadError));
    fetchCollectionRecords('countries')
      .then((rows) => {
        const names = mergePublicDestinations(rows).map((item) => item.name);
        setCountryOptions(names.length ? names : SEEDED_COUNTRIES);
      })
      .catch(() => setCountryOptions(SEEDED_COUNTRIES));
  }, []);

  const countryCategories = useMemo(
    () =>
      categories.filter((row) => {
        const value = pickString(row, ['country']);
        return !value || value.toLowerCase() === country.toLowerCase();
      }),
    [categories, country]
  );

  const savedForScope = useMemo(
    () => (category ? rows.filter((row) => keywordRowMatchesScope(row, country, category)) : []),
    [category, country, rows]
  );

  const savedSets = useMemo(
    () =>
      savedKeywordSets(rows).filter((set) => {
        if (country && set.country.toLowerCase() !== country.toLowerCase()) return false;
        return true;
      }),
    [country, rows]
  );

  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    setChips([]);
    setDraft('');
    setEditingSet(false);
    setStatus('');
    setError('');
  }, [country, category]);

  function addChip() {
    const incoming = uniqueKeywords(draft.split(/[,;\n]+/));
    if (!category) {
      setError('Select a category first.');
      return;
    }
    if (incoming.length === 0) return;
    setChips((current) => uniqueKeywords([...current, ...incoming]));
    setDraft('');
    setError('');
    setStatus('');
  }

  async function persistKeywords(
    nextChips: string[],
    options: { country: string; category: string; existingId?: string }
  ) {
    const payload = { country: options.country, category: options.category, keywords: nextChips };
    if (options.existingId) {
      return saveWithColumnFallback('keywords', payload, options.existingId);
    }
    return saveWithColumnFallback('keywords', { id: crypto.randomUUID(), ...payload }, { keepId: true });
  }

  async function deleteRows(ids: string[]) {
    const uniqueIds = ids.filter(Boolean);
    if (uniqueIds.length === 0) return { error: null as { message: string } | null };
    const response = await fetch('/api/admin/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return { error: { message: body.error || 'Failed to delete keywords.' } };
    }
    return { error: null };
  }

  async function saveKeywords(event?: React.FormEvent) {
    event?.preventDefault();
    const pending = uniqueKeywords(draft.split(/[,;\n]+/));
    const drafted = uniqueKeywords([...chips, ...pending]);

    if (!country) {
      setError('Select a country first.');
      return;
    }
    if (!category) {
      setError('Select a category first.');
      return;
    }

    const existing = uniqueKeywords(chipsFromKeywordRows(savedForScope));
    const nextChips = editingSet ? drafted : uniqueKeywords([...existing, ...drafted]);
    if (nextChips.length === 0) {
      setError('Add at least one keyword before saving.');
      return;
    }

    const existingRow = savedForScope[0];
    const duplicateIds = savedForScope
      .slice(1)
      .map((row) => String(row.id || ''))
      .filter(Boolean);

    setSaving(true);
    setError('');
    setStatus('');

    try {
      const result = await persistKeywords(nextChips, {
        country,
        category,
        existingId: existingRow?.id ? String(existingRow.id) : undefined,
      });
      if (result.error) {
        setSaving(false);
        setError(result.error.message);
        return;
      }

      await notifyAdminItemSaved({
        module: 'Keywords',
        action: existingRow?.id ? 'updated' : 'created',
        item: { country, category, keywords: nextChips.join(', '), id: existingRow?.id || result.data?.[0]?.id },
      });

      if (duplicateIds.length > 0) {
        await deleteRows(duplicateIds);
      }

      setChips([]);
      setDraft('');
      setEditingSet(false);
      setSaving(false);
      setStatus('Keywords saved.');
      await load();
    } catch (err) {
      setSaving(false);
      const message = err instanceof Error ? err.message : 'Failed to save keywords.';
      setError(message === 'Failed to fetch' ? 'Could not reach the server to save keywords. Try again.' : message);
    }
  }

  function editSet(index: number) {
    const set = savedSets[index];
    if (!set) return;
    skipResetRef.current = true;
    setCountry(set.country);
    setCategory(set.category);
    setChips(set.keywords);
    setDraft('');
    setEditingSet(true);
    setStatus('Editing this country and category set. Save to update.');
    setError('');
  }

  async function deleteSet(index: number) {
    const set = savedSets[index];
    if (!set) return;
    if (!confirm(`Delete all keywords for ${set.country} · ${set.category}?`)) return;

    setSaving(true);
    setError('');
    setStatus('');

    try {
      const result = await deleteRows(set.rowIds);
      if (result.error) {
        setSaving(false);
        setError(result.error.message);
        return;
      }

      if (
        country.toLowerCase() === set.country.toLowerCase() &&
        category.toLowerCase() === set.category.toLowerCase()
      ) {
        setChips([]);
        setDraft('');
        setEditingSet(false);
      }
      setSaving(false);
      setStatus('Keyword set deleted.');
      await load();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Failed to delete keywords.');
    }
  }

  return (
    <form onSubmit={saveKeywords} className="mx-auto w-full max-w-3xl">
      <h2 className="text-center font-serif text-3xl font-bold text-gray-900">Add Keyword</h2>

      <div className="mx-auto mt-8 max-w-md space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          Country
          <div className="mt-2">
            <SearchableSelect
              value={country}
              onChange={(value) => {
                setCountry(value);
                setCategory('');
              }}
              options={countryOptions.map((item) => ({ value: item, label: item }))}
              placeholder="Select country"
            />
          </div>
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          Category
          <div className="mt-2">
            <SearchableSelect
              value={category}
              onChange={setCategory}
              options={countryCategories.map((row) => ({
                value: pickString(row, ['title', 'name']),
                label: pickString(row, ['title', 'name']),
              }))}
              placeholder={country ? 'Select category' : 'Select country first'}
              disabled={!country}
            />
          </div>
        </label>
      </div>

      <div className="mx-auto mt-8 max-w-xl overflow-hidden">
        <KeywordTagBox
          tags={chips}
          draft={draft}
          onDraftChange={(value) => {
            setDraft(value);
            setError('');
            setStatus('');
          }}
          onAdd={addChip}
          onEdit={(tag) => {
            setChips((current) => current.filter((item) => item !== tag));
            setDraft(tag);
          }}
          onRemove={(tag) => {
            setChips((current) => current.filter((item) => item !== tag));
            setStatus('');
          }}
          placeholder={category ? 'Type a keyword and press Enter' : 'Select a category first'}
          disabled={!category}
          minHeightClass="min-h-[160px]"
        />
      </div>

      <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00945a] disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingSet ? 'Update' : 'Save'}
        </button>
        {status ? <p className="text-sm text-[#00A651]">{status}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {savedSets.length > 0 ? (
        <SavedBlocksGrid
          heading="Saved Keywords"
          className="mx-auto mt-10 max-w-3xl"
          lineClamp={1}
          blocks={savedSets.map((set) => {
            const count = set.keywords.length;
            return {
              title: `${set.country} · ${set.category}`,
              description: `${count} keyword${count === 1 ? '' : 's'}`,
            };
          })}
          onEdit={editSet}
          onDelete={deleteSet}
        />
      ) : (
        <p className="mx-auto mt-10 max-w-3xl text-sm text-[#6b7280]">
          Saved keywords for each country and category will appear here in one block after you click Save.
        </p>
      )}
    </form>
  );
}
