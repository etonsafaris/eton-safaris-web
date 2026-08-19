type SectionHeadingProps = {
  label?: string;
  title: string;
  subtitle?: string;
  labelClassName?: string;
  titleClassName?: string;
};

export default function SectionHeading({
  label,
  title,
  subtitle,
  labelClassName = 'text-moss',
  titleClassName = 'text-sage',
}: SectionHeadingProps) {
  return (
    <div className="relative pb-5 text-center">
      {label && (
        <p className={`mb-2.5 text-[1.2em] font-semibold leading-[1.3] ${labelClassName}`}>{label}</p>
      )}
      <h2 className={`font-merry text-[1.6rem] font-bold italic capitalize ${titleClassName}`}>{title}</h2>
      {subtitle && <p className="mx-auto mt-2 max-w-2xl text-sm text-[#666]">{subtitle}</p>}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-px left-1/2 h-0 w-0 -translate-x-1/2 border-x-[10px] border-b-[10px] border-x-transparent border-b-sage"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-[50px] -translate-x-1/2 border-t-[3px] border-sage"
      />
    </div>
  );
}
