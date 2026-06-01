'use client';

import { BrandCta, SectionShell } from './_common';
import { SKINCARE_CONTACT } from './_sampleContent';

const SECTION_ID = 'sec-contact';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'minimal';

export function ContactMinimal() {
  const contact = SKINCARE_CONTACT;

  return (
    <SectionShell id="contact" sectionId={SECTION_ID} background="gradient">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: '#D4AF37' }}
        >
          Get in touch
        </div>

        <h2
          className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight"
          style={{ color: 'var(--primary-color)' }}
        >
          Reach us in under five minutes
        </h2>

        <p className="mt-5 text-base md:text-lg leading-relaxed text-[#4a5560]">
          WhatsApp is the fastest. Or call, or drop us a line — we usually reply within the hour.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <BrandCta
            sectionId={SECTION_ID}
            intent="general-enquiry"
            variant="primary"
            size="lg"
            label="WhatsApp us"
          />
          <a
            href={`tel:${contact.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--primary-color)] px-9 py-4 text-lg font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5"
            style={{ color: 'var(--primary-color)' }}
          >
            Call {contact.phone}
          </a>
        </div>

        <div className="mt-10 pt-8 border-t border-[#e8e1c9] text-sm text-[#94918a] space-y-1">
          <div>
            {contact.addressLines.join(', ')}, {contact.cityLine}
          </div>
          <div>
            {contact.hours.map((h) => `${h.day}: ${h.time}`).join('  ·  ')}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.
