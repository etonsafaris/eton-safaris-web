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
  labelClassName = '',
  titleClassName = '',
}: SectionHeadingProps) {
  return (
    <div className="border-l-2 border-[#1c1915] pl-4 text-left">
      {label && (
        <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a5a2b] ${labelClassName}`}>{label}</p>
      )}
      <h2 className={`font-serif text-[1.75rem] font-medium normal-case leading-tight text-[#1c1915] ${titleClassName}`}>{title}</h2>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-[#5c564e]">{subtitle}</p>}
    </div>
  );
}
