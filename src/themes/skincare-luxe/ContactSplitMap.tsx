'use client';

import { BrandCta, SectionHeading, SectionShell } from './_common';
import { SKINCARE_CONTACT } from './_sampleContent';

const SECTION_ID = 'sec-contact';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'split-map';

export function ContactSplitMap() {
  const contact = SKINCARE_CONTACT;

  return (
    <SectionShell id="contact" sectionId={SECTION_ID}>
      <SectionHeading
        eyebrow="Get in touch"
        title="Visit us, or just say hello"
        subtitle="Walk-ins welcome. WhatsApp consults available for skin concerns before your first visit."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-2 items-stretch">
        {/* Details column */}
        <div className="flex flex-col gap-7 rounded-2xl border border-[#e8e1c9] bg-white p-7 md:p-8">
          <div>
            <h3
              className="font-heading text-xl font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Studio
            </h3>
            <address className="not-italic text-[#4a5560] leading-relaxed">
              {contact.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="mt-1">{contact.cityLine}</div>
            </address>
          </div>

          <div>
            <h3
              className="font-heading text-xl font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Hours
            </h3>
            <dl className="space-y-1.5 text-[#4a5560]">
              {contact.hours.map((row) => (
                <div key={row.day} className="flex justify-between gap-4">
                  <dt className="font-medium">{row.day}</dt>
                  <dd>{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3
              className="font-heading text-xl font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Reach us
            </h3>
            <div className="space-y-2 text-[#4a5560]">
              <a
                href={`tel:${contact.phone.replace(/\s/g, '')}`}
                className="block transition-colors hover:text-[color:var(--primary-color)]"
              >
                {contact.phone}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="block transition-colors hover:text-[color:var(--primary-color)]"
              >
                {contact.email}
              </a>
            </div>
          </div>

          <div className="pt-2">
            <BrandCta
              sectionId={SECTION_ID}
              intent="book-appointment"
              variant="primary"
              size="md"
              label="Book on WhatsApp"
            />
          </div>
        </div>

        {/* Map column */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e1c9] bg-[#f3eee0] min-h-[400px]">
          <iframe
            title="Map"
            src={contact.mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: 400 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.
