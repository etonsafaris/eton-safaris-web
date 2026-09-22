'use client';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-[#374151]">{children}</label>;
}

export default function HomePageFields({
  footerAbout,
  contactAddress,
  contactEmail,
  contactPhone,
  onFooterAbout,
  onContactAddress,
  onContactEmail,
  onContactPhone,
}: {
  footerAbout: string;
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  onFooterAbout: (value: string) => void;
  onContactAddress: (value: string) => void;
  onContactEmail: (value: string) => void;
  onContactPhone: (value: string) => void;
}) {
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
        <h2 className="font-serif text-2xl font-bold italic text-[#374151]">Footer — Contact Info</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Location, email, and phone number in the footer Contact Info column (WhatsApp link uses the phone digits).
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
          <div>
            <FieldLabel>Contact number</FieldLabel>
            <input
              type="text"
              value={contactPhone}
              onChange={(event) => onContactPhone(event.target.value)}
              className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm outline-none focus:border-[#66bb9a]"
              placeholder="+256 751 180 436"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
