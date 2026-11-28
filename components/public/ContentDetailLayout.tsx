import PostMetaBar, { type MetaItem } from '@/components/public/PostMetaBar';
import FitRelatedSidebar from '@/components/public/FitRelatedSidebar';

export default function ContentDetailLayout({
  country,
  location,
  published,
  showLocation = true,
  items,
  hideMeta = false,
  sidebarTitle,
  sidebarItems,
  sidebarAlways = false,
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
  sidebarAlways?: boolean;
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
      <section className="bg-[#f6f1e8]">
        <article data-content-article className="mx-auto min-w-0 max-w-3xl px-5 py-10 md:px-8">
          {children}
        </article>
        <div className="border-t border-[#d9d2c5] px-5 py-8 md:px-8">
          <FitRelatedSidebar
            title={sidebarTitle}
            items={sidebarItems}
            countryName={country}
            alwaysShow={sidebarAlways}
            layout="rail"
          />
        </div>
      </section>
      {below}
    </>
  );
}
