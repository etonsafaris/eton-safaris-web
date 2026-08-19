'use client';

export default function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="absolute -left-[10000px] h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>
        Company website
        <input
          tabIndex={-1}
          autoComplete="off"
          name="company_website"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export function isSpamHoneypot(value: string) {
  return Boolean(value.trim());
}
