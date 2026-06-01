'use client';

import { BrandCta, SectionHeading, SectionShell } from './_common';
import { SKINCARE_SERVICES, type ServiceItem } from './_sampleContent';

const SECTION_ID = 'sec-services';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'list-icons';

function ServiceRow({ service }: { service: ServiceItem }) {
  return (
    <div
      className="group flex items-start gap-5 md:gap-6 py-6 md:py-7 border-b border-[#e8e1c9] last:border-b-0"
      data-product-tag={service.id}
    >
      <div
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border"
        style={{
          background: 'color-mix(in srgb, var(--primary-color) 8%, #ffffff)',
          borderColor: 'color-mix(in srgb, var(--primary-color) 25%, transparent)',
        }}
      >
        <span
          className="font-heading text-xl font-bold"
          style={{ color: 'var(--primary-color)' }}
        >
          {service.title.charAt(0)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h3
            className="font-heading text-lg md:text-xl font-semibold"
            style={{ color: 'var(--primary-color)' }}
          >
            {service.title}
          </h3>
          <span
            className="font-heading text-lg md:text-xl font-semibold"
            style={{ color: '#D4AF37' }}
          >
            {service.priceLabel}
          </span>
        </div>
        <p className="mt-1.5 text-sm md:text-[15px] leading-relaxed text-[#4a5560]">
          {service.description}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider text-[#94918a]">
            {service.durationLabel}
          </span>
          <span className="text-[#d4d4d4]">·</span>
          <BrandCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            productTag={service.id}
            variant="outline"
            size="sm"
            className="!py-1.5 !px-4 !text-xs !shadow-none"
            label="Book this"
          />
        </div>
      </div>
    </div>
  );
}

export function ServicesListIcons() {
  return (
    <SectionShell id="services" sectionId={SECTION_ID}>
      <SectionHeading
        eyebrow="Our menu"
        title="Treatments crafted for visible results"
        subtitle="Each ritual is sequenced by a certified esthetician."
        align="left"
      />

      <div className="mt-12 max-w-3xl">
        {SKINCARE_SERVICES.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.
