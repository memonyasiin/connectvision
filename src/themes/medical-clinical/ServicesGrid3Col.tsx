'use client';

import { ClinicCta, ClinicHeading, ClinicShell } from './_common';
import { CLINIC_SERVICES, type MedicalService } from './_sampleContent';

const SECTION_ID = 'sec-services';
const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'grid-3col';

const CATEGORY_DOT: Record<MedicalService['category'], string> = {
  general:     '#0e7490',
  paediatric:  '#7c3aed',
  dermatology: '#db2777',
  diagnostic:  '#ea580c',
  preventive:  '#16a34a',
  dental:      '#0891b2',
};

const CATEGORY_LABEL: Record<MedicalService['category'], string> = {
  general:     'General',
  paediatric:  'Paediatric',
  dermatology: 'Dermatology',
  diagnostic:  'Diagnostic',
  preventive:  'Preventive',
  dental:      'Dental',
};

function ServiceCard({ service }: { service: MedicalService }) {
  return (
    <article
      data-product-tag={service.id}
      className="flex flex-col h-full p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: CATEGORY_DOT[service.category] }}
          aria-hidden
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {CATEGORY_LABEL[service.category]}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-2">
        {service.name}
      </h3>

      <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-5">
        {service.description}
      </p>

      <div className="pt-5 mt-auto border-t border-slate-100 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {service.durationMin} min
          </div>
          <div
            className="mt-0.5 text-lg font-semibold tabular-nums"
            style={{ color: 'var(--primary-color)' }}
          >
            {service.priceLabel}
          </div>
        </div>
        <ClinicCta
          sectionId={SECTION_ID}
          intent="book-appointment"
          productTag={service.id}
          variant="outline"
          size="sm"
          label="Book"
        />
      </div>
    </article>
  );
}

export function ServicesGrid3Col() {
  return (
    <ClinicShell id="services" sectionId={SECTION_ID} background="slate">
      <div data-theme={THEME_ID} data-section-kind="services" data-variant={VARIANT_ID}>
        <ClinicHeading
          eyebrow="Treatments"
          title="What we treat"
          subtitle="Outpatient consultations across general medicine, paediatrics, dermatology, dental, and OBGYN. Diagnostic services with on-letterhead reports."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CLINIC_SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </ClinicShell>
  );
}
