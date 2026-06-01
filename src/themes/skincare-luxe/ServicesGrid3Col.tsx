'use client';

import { BrandCta, SectionHeading, SectionShell } from './_common';
import { SKINCARE_SERVICES, type ServiceItem } from './_sampleContent';

const SECTION_ID = 'sec-services';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'grid-3col';

function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <article
      className="group relative flex flex-col rounded-2xl border border-[#e8e1c9] bg-white p-6 md:p-7 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
      data-product-tag={service.id}
    >
      {/* Icon disc */}
      <div
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: 'color-mix(in srgb, var(--primary-color) 10%, #ffffff)' }}
      >
        <span
          className="text-lg font-bold"
          style={{ color: 'var(--primary-color)' }}
        >
          {service.title.charAt(0)}
        </span>
      </div>

      <h3
        className="font-heading text-xl font-semibold leading-tight"
        style={{ color: 'var(--primary-color)' }}
      >
        {service.title}
      </h3>

      <p className="mt-2 flex-1 text-sm md:text-[15px] leading-relaxed text-[#4a5560]">
        {service.description}
      </p>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-[#94918a]">
            {service.durationLabel}
          </div>
          <div
            className="mt-1 font-heading text-2xl font-semibold"
            style={{ color: '#D4AF37' }}
          >
            {service.priceLabel}
          </div>
        </div>
        <BrandCta
          sectionId={SECTION_ID}
          intent="book-appointment"
          productTag={service.id}
          variant="primary"
          size="sm"
          label="Book"
        />
      </div>
    </article>
  );
}

export function ServicesGrid3Col() {
  return (
    <SectionShell id="services" sectionId={SECTION_ID} background="cream">
      <SectionHeading
        eyebrow="Our menu"
        title="Treatments crafted for visible results"
        subtitle="Each ritual is sequenced by a certified esthetician. Walk in for a free skin scan before your first booking."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SKINCARE_SERVICES.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.
