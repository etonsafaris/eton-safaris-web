import { Calendar } from 'lucide-react';

export default function DateBar() {
  const label = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="border-b border-[#d9d2c5] bg-[#f6f1e8] px-4 py-2 text-left text-xs uppercase tracking-[0.16em] text-[#5c564e] md:text-sm">
      <span className="inline-flex items-center justify-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-sage" />
        {label}
      </span>
    </div>
  );
}
