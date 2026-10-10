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
      <section className="bg-white">
        <div className="relative grid grid-cols-1 items-start gap-3 px-5 py-5 lg:grid-cols-4">
          <article data-content-article className="min-w-0 lg:col-span-3 lg:pl-[30px] lg:pr-[50px]">
            {children}
          </article>
          <FitRelatedSidebar
            title={sidebarTitle}
            items={sidebarItems}
            countryName={country}
            alwaysShow={sidebarAlways}
          />
        </div>
      </section>
      {below}
    </>
  );
}
