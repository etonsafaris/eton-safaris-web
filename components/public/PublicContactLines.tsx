'use client';

import { Mail, MessageCircle, Phone } from 'lucide-react';
import {
  phoneCallHref,
  phoneWhatsAppHref,
  type ContactEmail,
  type ContactPhone,
} from '@/lib/home-page-content';

/** Call, WhatsApp, and email rows, stacked the same way as the site footer. */
export default function PublicContactLines({
  phones,
  emails,
  className = '',
  rowClassName = 'flex items-center gap-2',
  iconClassName = 'h-4 w-4 shrink-0',
}: {
  phones: ContactPhone[];
  emails: ContactEmail[];
  className?: string;
  rowClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {phones.map((phone) => (
        <div key={phone.id} className="flex flex-col gap-2">
          {phone.call ? (
            <a href={phoneCallHref(phone.number)} className={rowClassName} aria-label={`Call ${phone.number}`}>
              <Phone className={iconClassName} aria-hidden />
              <span className="min-w-0 break-words">{phone.number}</span>
            </a>
          ) : null}
          {phone.whatsapp ? (
            <a
              href={phoneWhatsAppHref(phone.number)}
              target="_blank"
              rel="noreferrer"
              className={rowClassName}
              aria-label={`WhatsApp ${phone.number}`}
            >
              <MessageCircle className={iconClassName} aria-hidden />
              <span className="min-w-0 break-words">{phone.number}</span>
            </a>
          ) : null}
          {!phone.call && !phone.whatsapp ? (
            <p className={rowClassName}>
              <Phone className={iconClassName} aria-hidden />
              <span>{phone.number}</span>
            </p>
          ) : null}
        </div>
      ))}
      {emails.map((email) => (
        <a key={email.id} href={`mailto:${email.address}`} className={rowClassName}>
          <Mail className={iconClassName} aria-hidden />
          <span className="min-w-0 break-words">{email.address}</span>
        </a>
      ))}
    </div>
  );
}
