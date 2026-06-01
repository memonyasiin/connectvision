'use client';

import { useState, type FormEvent } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { WarmCta, WarmHeading, WarmShell } from './_common';
import { RESTAURANT_CONTACT } from './_sampleContent';

const SECTION_ID = 'sec-contact';
const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'split-map';

interface FormState {
  name: string;
  partySize: string;
  date: string;
  time: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  partySize: '2',
  date: '',
  time: '20:00',
  notes: '',
};

function buildReservationBody(state: FormState, businessName: string): string {
  const lines = [
    `Hi ${businessName}, I'd like to book a table.`,
    '',
    `• Name: ${state.name || '(not provided)'}`,
    `• Party of: ${state.partySize}`,
    `• Date: ${state.date || '(any)'}`,
    `• Time: ${state.time || '(any)'}`,
  ];
  if (state.notes.trim()) lines.push(`• Notes: ${state.notes.trim()}`);
  return lines.join('\n');
}

export function ContactSplitMap() {
  const { currentConfig } = useBuild();
  const { businessName } = currentConfig;
  const contact = RESTAURANT_CONTACT;
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // The actual submit hands off to WarmCta below — we just prevent the
  // default form POST so React state survives.
  const onSubmit = (e: FormEvent) => e.preventDefault();

  const prefillBody = buildReservationBody(form, businessName);

  return (
    <WarmShell id="contact" sectionId={SECTION_ID} background="white">
      <div data-theme={THEME_ID} data-section-kind="contact" data-variant={VARIANT_ID}>
        <WarmHeading
          eyebrow="Reservations"
          title="Book a table"
          subtitle="WhatsApp is the fastest. Fill the details below and we'll confirm within the hour."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr] items-stretch">
          {/* Reservation form */}
          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-7 md:p-8"
          >
            <h3
              className="text-2xl font-light text-stone-900 mb-6"
              style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
            >
              Tell us a little
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-stone-500">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Your name"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-stone-500">Party size</span>
                <select
                  value={form.partySize}
                  onChange={(e) => setForm({ ...form, partySize: e.target.value })}
                  className="rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'person' : 'people'}
                    </option>
                  ))}
                  <option value="10+">10+ (catering enquiry)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-stone-500">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-stone-500">Time</span>
                <select
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="19:00">7:00 pm</option>
                  <option value="19:30">7:30 pm</option>
                  <option value="20:00">8:00 pm</option>
                  <option value="20:30">8:30 pm</option>
                  <option value="21:00">9:00 pm</option>
                  <option value="21:30">9:30 pm</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-stone-500">Notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Allergies, occasion, dietary preferences …"
                />
              </label>
            </div>

            <div className="mt-6">
              <WarmCta
                sectionId={SECTION_ID}
                intent="book-appointment"
                productTag="reservation-form"
                prefillBody={prefillBody}
                variant="filled"
                size="lg"
                label="Send via WhatsApp"
                className="w-full md:w-auto"
              />
              <p className="mt-3 text-xs italic text-stone-500">
                {contact.reservationNote}
              </p>
            </div>
          </form>

          {/* Map + address details */}
          <div className="flex flex-col gap-5">
            <div className="rounded-lg overflow-hidden border border-amber-200/60 flex-1 min-h-[280px] bg-amber-50/30">
              <iframe
                title="Map"
                src={contact.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 280 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="rounded-lg border border-amber-200/60 bg-white p-6">
              <h4 className="text-xs uppercase tracking-wider text-stone-500 mb-2">Find us</h4>
              <address className="not-italic text-sm leading-relaxed text-stone-700">
                {contact.addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                <div className="mt-1">{contact.cityLine}</div>
              </address>

              <div className="mt-4 pt-4 border-t border-stone-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-stone-500 mb-0.5">Call</div>
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, '')}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {contact.phone}
                  </a>
                </div>
                <div>
                  <div className="text-stone-500 mb-0.5">Email</div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-5">
              <h4 className="text-xs uppercase tracking-wider text-stone-500 mb-3">Hours</h4>
              <dl className="space-y-1.5 text-sm text-stone-700">
                {contact.hours.map((row) => (
                  <div key={row.day} className="flex justify-between gap-3">
                    <dt className="font-medium">{row.day}</dt>
                    <dd className={row.closed ? 'text-stone-400 italic' : ''}>{row.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </WarmShell>
  );
}
