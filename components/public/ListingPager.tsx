import Link from 'next/link';

/** Server-rendered pagination so listings need no client fetch to reach every record. */
export default function ListingPager({
  basePath,
  page,
  pageSize,
  total,
  label,
  extraQuery = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  label: string;
  extraQuery?: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(extraQuery);
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-label={`${label} pages`}>
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="rounded-full border border-moss px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
        >
          Previous
        </Link>
      ) : null}
      <span className="text-xs font-semibold uppercase tracking-widest text-[#555]">
        Page {page} of {totalPages.toLocaleString()}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"
        >
          Load more {label}
        </Link>
      ) : null}
    </nav>
  );
}
