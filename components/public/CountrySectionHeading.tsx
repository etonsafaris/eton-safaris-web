/** Matches park detail “Where to Stay” / Amazing Safaris green section titles. */
export default function CountrySectionHeading({ children }: { children: string }) {
  return (
    <div className="dav-amazing-title">
      <h3>{children}</h3>
      <span className="dav-amazing-underline" aria-hidden />
    </div>
  );
}
