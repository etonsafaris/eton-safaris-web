import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { pickDateValue, pickNumber, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export type OpsColumn = {
  label: string;
  keys: string[];
  badge?: boolean;
  money?: boolean;
  date?: boolean;
  clamp?: boolean;
};

export function statusBadgeClass(status: string) {
  const value = status.toLowerCase();
  if (/unread|new/.test(value)) return 'bg-red-100 text-red-800';
  if (/confirm|active|paid|complete|success|quoted|read/.test(value)) return 'bg-green-100 text-green-800';
  if (/pending|partial|down payment/.test(value)) return 'bg-amber-100 text-amber-800';
  if (/cancel|fail|inactive|closed|error/.test(value)) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
}

function cellValue(record: RecordRow, column: OpsColumn) {
  if (column.money) {
    const amount = pickNumber(record, column.keys);
    const currency = pickString(record, ['currency']) || 'USD';
    return amount ? `${currency} ${amount.toLocaleString()}` : '—';
  }
  if (column.date) {
    const raw = pickDateValue(record, column.keys);
    return raw ? formatPublishedDate(raw) : '—';
  }
  return pickString(record, column.keys) || '—';
}

export default function OpsRecordTable({
  columns,
  records,
  extraActions,
  onEdit,
  onView,
  onDelete,
}: {
  columns: OpsColumn[];
  records: RecordRow[];
  extraActions?: (record: RecordRow) => React.ReactNode;
  onEdit?: (record: RecordRow) => void;
  onView?: (record: RecordRow) => void;
  onDelete: (record: RecordRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm dark:border-white/10 dark:bg-[#161b22]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] dark:bg-white/5 dark:text-gray-400">
            <tr>
              {columns.map((column) => (
                <th key={column.label} className="whitespace-nowrap px-4 py-3">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr
                key={String(record.id ?? index)}
                className={`border-t border-[#eef0f3] hover:bg-[#f9fafb] dark:border-white/5 dark:hover:bg-white/5 ${
                  onView ? 'cursor-pointer' : ''
                }`}
                onClick={onView ? () => onView(record) : undefined}
              >
                {columns.map((column) => {
                  const value = cellValue(record, column);
                  return (
                    <td key={column.label} className="max-w-[220px] px-4 py-3 align-top text-[#111827] dark:text-gray-200">
                      {column.badge ? (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(value)}`}>
                          {value}
                        </span>
                      ) : (
                        <span className={column.clamp ? 'line-clamp-2' : undefined}>{value}</span>
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {extraActions?.(record)}
                    {onView ? (
                      <button
                        type="button"
                        onClick={() => onView(record)}
                        aria-label="View"
                        className="rounded-lg border border-[#e5e7eb] p-1.5 text-[#6b7280] hover:border-[#00A651] hover:text-[#00A651] dark:border-white/10 dark:text-gray-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        aria-label="Edit"
                        className="rounded-lg border border-[#e5e7eb] p-1.5 text-[#6b7280] hover:border-[#00A651] hover:text-[#00A651] dark:border-white/10 dark:text-gray-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onDelete(record)}
                      aria-label="Delete"
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
