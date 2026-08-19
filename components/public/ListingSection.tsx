export default function ListingSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-[#f3f3f3] py-12 md:py-14 ${className}`}>
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">{children}</div>
    </section>
  );
}

export function ListingGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
