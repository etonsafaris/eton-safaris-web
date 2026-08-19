import { Calendar } from 'lucide-react';

export default function DateBar() {
  const label = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-forest px-4 py-2 text-center text-xs text-white md:text-sm">
      <span className="inline-flex items-center justify-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-sage" />
        {label}
      </span>
    </div>
  );
}
