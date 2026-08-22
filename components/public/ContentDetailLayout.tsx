import PostMetaBar, { type MetaItem } from '@/components/public/PostMetaBar';
import RelatedSidebar from '@/components/public/RelatedSidebar';

export default function ContentDetailLayout({
  country,
  location,
  published,
  showLocation = true,
  items,
  hideMeta = false,
  sidebarTitle,
  sidebarItems,
  children,
  below,
}: {
  country?: string;
  location?: string;
  published?: string;
  showLocation?: boolean;
  items?: MetaItem[];
  hideMeta?: boolean;
  sidebarTitle: string;
  sidebarItems: { href: string; image?: string | null; title: string; date?: string }[];
  children: React.ReactNode;
  below?: React.ReactNode;
}) {
  return (
    <>
      {hideMeta ? null : (
        <PostMetaBar
          country={country}
          location={location}
          published={published}
          showLocation={showLocation}
          items={items}
        />
      )}
      <section className="bg-white">
        <div className="grid grid-cols-1 items-start gap-3 px-5 py-5 lg:grid-cols-4">
          <article className="min-w-0 lg:col-span-3 lg:pl-[30px] lg:pr-[50px]">{children}</article>
          <RelatedSidebar title={sidebarTitle} items={sidebarItems} countryName={country} />
        </div>
      </section>
      {below}
    </>
  );
}
