'use client';

export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'neutral',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'neutral' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#161b22]">
        <h3 id="admin-confirm-title" className="text-lg font-bold text-[#111827] dark:text-white">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${
              tone === 'danger' ? 'bg-[#c81e1e] hover:bg-[#a51818]' : 'bg-[#00A651] hover:bg-[#009247]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
