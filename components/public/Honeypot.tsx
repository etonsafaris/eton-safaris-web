'use client';

export default function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute left-[-10000px] top-auto h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    >
      <label className="sr-only">
        Leave blank
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
