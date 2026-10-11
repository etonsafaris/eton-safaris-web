'use client';

import { Phone, Trash2 } from 'lucide-react';
import SocialBrandIcon from '@/components/public/SocialBrandIcon';
import {
  SOCIAL_NETWORKS,
  newContactPhone,
  newSocialLink,
  type ContactPhone,
  type SocialLink,
} from '@/lib/home-page-content';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#374151]">{children}</label>;
}

export default function HomePageFields({
  footerAbout,
  contactAddress,
  contactEmail,
  phones,
  socials,
  onFooterAbout,
  onContactAddress,
  onContactEmail,
  onPhones,
  onSocials,
}: {
  footerAbout: string;
  contactAddress: string;
  contactEmail: string;
  phones: ContactPhone[];
  socials: SocialLink[];
  onFooterAbout: (value: string) => void;
  onContactAddress: (value: string) => void;
  onContactEmail: (value: string) => void;
  onPhones: (value: ContactPhone[]) => void;
  onSocials: (value: SocialLink[]) => void;
}) {
  function updatePhone(id: string, patch: Partial<ContactPhone>) {
    onPhones(phones.map((phone) => (phone.id === id ? { ...phone, ...patch } : phone)));
  }

  function updateSocial(id: string, patch: Partial<SocialLink>) {
    onSocials(socials.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Footer — About Us</h2>
        <p className="mt-1 text-sm text-[#6b7280]">Shown in the first column of the site footer.</p>
        <textarea
          value={footerAbout}
          onChange={(event) => onFooterAbout(event.target.value)}
          rows={5}
          className="mt-5 w-full rounded-2xl border border-[#e5e7eb] bg-white px-5 py-3 text-sm leading-relaxed outline-none focus:border-[#66bb9a]"
          placeholder="Footer about text"
        />
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Social media</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          These links update the footer, the contact page, and every other place the site shows social icons.
        </p>
        <div className="mt-5 space-y-3">
          {socials.map((link) => (
            <div key={link.id} className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 sm:w-56">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-white">
                  <SocialBrandIcon network={link.network} className="h-4 w-4" />
                </span>
                <select
                  value={link.network}
                  onChange={(event) => updateSocial(link.id, { network: event.target.value })}
                  className="w-full rounded-full border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#66bb9a]"
                  aria-label="Social network"
                >
                  {SOCIAL_NETWORKS.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={link.url}
                onChange={(event) => updateSocial(link.id, { url: event.target.value })}
                className="w-full flex-1 rounded-full border border-[#e5e7eb] px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
                placeholder="https://"
              />
              <button
                type="button"
                onClick={() => onSocials(socials.filter((item) => item.id !== link.id))}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#6b7280] hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onSocials([...socials, newSocialLink()])}
          className="mt-4 rounded-full bg-[#10b981] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#059669]"
        >
          Add media
        </button>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-6">
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Footer — Contact Info</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Location, email, and phone numbers. Add numbers one under another. Choose Call, WhatsApp, or both for each number.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <FieldLabel>Location</FieldLabel>
            <textarea
              value={contactAddress}
              onChange={(event) => onContactAddress(event.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
              placeholder="Wakiso District, Central Region, Uganda"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => onContactEmail(event.target.value)}
              className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
              placeholder="hello@example.com"
            />
          </div>
          <div className="space-y-3">
            <FieldLabel>Phone numbers</FieldLabel>
            {phones.map((phone, index) => (
              <div key={phone.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Number {index + 1}</p>
                <input
                  type="text"
                  value={phone.number}
                  onChange={(event) => updatePhone(phone.id, { number: event.target.value })}
                  className="w-full rounded-full border border-[#e5e7eb] px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
                  placeholder="+256 751 180 436"
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 flex items-center gap-2 font-semibold text-[#374151]">
                      <Phone className="h-4 w-4" /> Call
                    </span>
                    <select
                      value={phone.call ? 'yes' : 'no'}
                      onChange={(event) => updatePhone(phone.id, { call: event.target.value === 'yes' })}
                      className="w-full rounded-full border border-[#e5e7eb] px-4 py-2 text-sm outline-none focus:border-[#66bb9a]"
                    >
                      <option value="yes">Use this number for calls</option>
                      <option value="no">Not a call number</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 flex items-center gap-2 font-semibold text-[#374151]">
                      <SocialBrandIcon network="whatsapp" className="h-4 w-4" /> WhatsApp
                    </span>
                    <select
                      value={phone.whatsapp ? 'yes' : 'no'}
                      onChange={(event) => updatePhone(phone.id, { whatsapp: event.target.value === 'yes' })}
                      className="w-full rounded-full border border-[#e5e7eb] px-4 py-2 text-sm outline-none focus:border-[#66bb9a]"
                    >
                      <option value="yes">Use this number for WhatsApp</option>
                      <option value="no">Not a WhatsApp number</option>
                    </select>
                  </label>
                </div>
                {phones.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onPhones(phones.filter((item) => item.id !== phone.id))}
                    className="mt-3 text-xs font-semibold text-[#6b7280] hover:text-red-600"
                  >
                    Remove this number
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onPhones([...phones, newContactPhone()])}
              className="rounded-full bg-[#10b981] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#059669]"
            >
              Add phone number
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
