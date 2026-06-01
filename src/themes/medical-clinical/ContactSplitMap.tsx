'use client';

import { ClinicCta, ClinicHeading, ClinicShell } from './_common';
import { CLINIC_CONTACT } from './_sampleContent';

const SECTION_ID = 'sec-contact';
const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'split-map';

export function ContactSplitMap() {
  const contact = CLINIC_CONTACT;
  const phoneHref = `tel:${contact.phone.replace(/\s/g, '')}`;
  const emergencyHref = `tel:${contact.emergencyPhone.replace(/\s/g, '')}`;

  return (
    <ClinicShell id="contact" sectionId={SECTION_ID} background="slate">
      <div data-theme={THEME_ID} data-section-kind="contact" data-variant={VARIANT_ID}>
        <ClinicHeading
          eyebrow="Visit"
          title="Find the clinic"
          subtitle="Walk-ins welcome for general consultations. Specialist appointments by prior booking."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr] items-stretch">
          {/* Details column */}
          <div className="flex flex-col gap-5">
            {/* Address */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Address</h4>
              <address className="not-italic text-sm leading-relaxed text-slate-700">
                {contact.addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                <div className="mt-1">{contact.cityLine}</div>
              </address>
              <p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
                {contact.accessibilityNote}
              </p>
            </div>

            {/* Hours */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Hours</h4>
              <dl className="space-y-2 text-sm">
                {contact.hours.map((row) => (
                  <div key={row.day} className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-700">{row.day}</dt>
                    <dd className={row.emergencyOnly ? 'text-rose-700 italic font-medium' : 'text-slate-600'}>
                      {row.time}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* CTAs */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Reach us</h4>
              <div className="flex flex-col gap-3">
                <ClinicCta
                  sectionId={SECTION_ID}
                  intent="book-appointment"
                  productTag="contact-book"
                  variant="primary"
                  size="md"
                  label="Book on WhatsApp"
                  className="!justify-start"
                />
                <a
                  href={phoneHref}
                  className="inline-flex items-center justify-start px-6 py-3 text-sm font-medium rounded-md border bg-white border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reception · {contact.phone}
                </a>
                <a
                  href={emergencyHref}
                  className="inline-flex items-center justify-start px-6 py-3 text-sm font-semibold rounded-md bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Emergency · {contact.emergencyPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Map column */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white min-h-[480px] lg:min-h-0">
            <iframe
              title="Clinic location"
              src={contact.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 480 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </ClinicShell>
  );
}
