'use client';

// Contact — fitness category, minimal dark variant. Two CTAs (WhatsApp +
// phone) above a compact address/hours block.

import { BoldCta, BoldShell } from './_common';
import { FITNESS_CONTACT } from './_sampleContent';

const SECTION_ID = 'sec-contact';
const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'minimal';

export function ContactMinimal() {
  const contact = FITNESS_CONTACT;
  const phoneHref = `tel:${contact.phone.replace(/\s/g, '')}`;

  return (
    <BoldShell id="contact" sectionId={SECTION_ID} background="gradient">
      <div
        data-theme={THEME_ID}
        data-section-kind="contact"
        data-variant={VARIANT_ID}
        className="max-w-2xl mx-auto text-center"
      >
        <div
          className="inline-block mb-4 px-3 py-1 text-[10px] font-bold uppercase"
          style={{
            color: 'var(--primary-color)',
            border: '1px solid color-mix(in srgb, var(--primary-color) 60%, transparent)',
            letterSpacing: '0.18em',
          }}
        >
          Get started
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-[0.95] tracking-tighter text-white">
          Walk in or hit us up
        </h2>

        <p className="mt-5 text-sm md:text-base leading-relaxed text-white/60 max-w-prose mx-auto">
          Open 24/7. First trial is free — no card, no contract. WhatsApp is the fastest way to reserve a slot.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <BoldCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            productTag="free-trial"
            variant="filled"
            size="lg"
            label="WhatsApp now"
          />
          <a
            href={phoneHref}
            className="inline-flex items-center justify-center px-9 py-4.5 text-base font-bold uppercase border border-white/25 text-white transition-transform duration-150 hover:-translate-y-0.5"
            style={{ letterSpacing: '0.08em' }}
          >
            {contact.phone}
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 grid sm:grid-cols-2 gap-6 text-left text-sm">
          <div>
            <h4
              className="text-[10px] font-bold uppercase text-white/40 mb-2"
              style={{ letterSpacing: '0.18em' }}
            >
              Address
            </h4>
            <address className="not-italic text-white/80 leading-relaxed">
              {contact.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>{contact.cityLine}</div>
            </address>
            <div className="mt-2 text-xs text-white/40">{contact.parkingNote}</div>
          </div>

          <div>
            <h4
              className="text-[10px] font-bold uppercase text-white/40 mb-2"
              style={{ letterSpacing: '0.18em' }}
            >
              Hours
            </h4>
            <dl className="space-y-1.5 text-white/80">
              {contact.hours.map((row) => (
                <div key={row.day}>
                  <dt className="font-medium">{row.day}</dt>
                  <dd className="text-white/50 text-xs">{row.time}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 text-xs text-white/40">
              Emergency / on-call: <span className="text-white/70 font-mono">{contact.emergencyPhone}</span>
            </div>
          </div>
        </div>
      </div>
    </BoldShell>
  );
}
