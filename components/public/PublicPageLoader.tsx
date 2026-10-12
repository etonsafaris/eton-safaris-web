export default function PublicPageLoader({
  label = 'Loading...',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-6xl px-4 py-16 ${className}`} role="status" aria-live="polite">
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
