import Link from 'next/link';

type ClickableCardProps = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
};

const baseClass =
  'group block h-full overflow-hidden rounded-xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg';

export default function ClickableCard({ href, onClick, children, className = '' }: ClickableCardProps) {
  const classes = `${baseClass} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} w-full text-left`}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
