import type { ReviewPlatformId } from '@/lib/home-page-content';

/** Brand mark shown in admin as soon as a platform is chosen, and on public testimonials when that platform has a link. */
export default function ReviewPlatformLogo({ id, className = 'h-8 w-8' }: { id: ReviewPlatformId; className?: string }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7C21.7 18.7 23 15.8 23 12.3z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v3c2 4 6.1 6.7 10.7 6.7z" />
        <path fill="#FBBC05" d="M5.1 14.3A7.2 7.2 0 0 1 4.7 12c0-.8.1-1.6.4-2.3v-3H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.3l3.8-3z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.3 2.7 1.3 6.7l3.8 3C6.1 7 8.8 4.8 12 4.8z" />
      </svg>
    );
  }
  if (id === 'tripadvisor') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="7.2" cy="13" r="4.4" fill="#00AF87" />
        <circle cx="16.8" cy="13" r="4.4" fill="#00AF87" />
        <circle cx="7.2" cy="13" r="1.7" fill="#1a1a1a" />
        <circle cx="16.8" cy="13" r="1.7" fill="#1a1a1a" />
        <path fill="#00AF87" d="M12 3.2c.7 1.4 1.6 2.2 2.6 2.6-1 .2-1.8.8-2.6 1.8-.8-1-1.6-1.6-2.6-1.8 1-.4 1.9-1.2 2.6-2.6z" />
      </svg>
    );
  }
  if (id === 'trustpilot') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="#00B67A" d="M12 2.2 14.7 9h7.1l-5.8 4.2 2.2 6.8L12 15.8 5.8 20l2.2-6.8L2.2 9h7.1L12 2.2z" />
      </svg>
    );
  }
  if (id === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="#1877F2" d="M14.5 8.5V6.7c0-.7.5-1 1.2-1H17V3h-2.1C12.2 3 11 4.4 11 6.5v2H9v2.6h2V21h3.5v-9.9h2.3l.4-2.6h-2.7z" />
      </svg>
    );
  }
  if (id === 'booking') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="4" fill="#003580" />
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
          B.
        </text>
      </svg>
    );
  }
  const letter = letterMark(id);
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={letter.color} />
      <text x="12" y="16" textAnchor="middle" fontSize={letter.text.length > 2 ? 6.5 : 10} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
        {letter.text}
      </text>
    </svg>
  );
}

function letterMark(id: ReviewPlatformId): { text: string; color: string } {
  switch (id) {
    case 'safaribookings':
      return { text: 'SB', color: '#1F8A4C' };
    case 'travelstride':
      return { text: 'TS', color: '#0E7C86' };
    case 'safaripicked':
      return { text: 'SP', color: '#E07A2F' };
    case 'tourradar':
      return { text: 'TR', color: '#E85D04' };
    case 'getyourguide':
      return { text: 'GYG', color: '#FF5533' };
    case 'viator':
      return { text: 'V', color: '#1B8F6A' };
    case 'trip':
      return { text: 'Trip', color: '#287DFA' };
    default:
      return { text: 'R', color: '#111' };
  }
}
