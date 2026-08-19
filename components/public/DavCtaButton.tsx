export default function DavCtaButton({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`dav-cta ${className}`}>{children}</span>;
}
