'use client';

import Image from 'next/image';
import { ClinicCta, ClinicHeading, ClinicShell } from './_common';
import { CLINIC_DOCTORS, type Doctor } from './_sampleContent';

const SECTION_ID = 'sec-roster';
const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'doctor-cards';

const DAY_LABEL: Record<Doctor['availableDays'][number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
};

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const prefillBody = [
    `Hi, I'd like to book a consultation with ${doctor.name}.`,
    '',
    `• Specialty: ${doctor.specialty}`,
    `• Preferred days: ${doctor.availableDays.map((d) => DAY_LABEL[d]).join(', ')}`,
    `• Available hours: ${doctor.availableHours}`,
  ].join('\n');

  return (
    <article
      data-product-tag={doctor.id}
      className="flex flex-col h-full rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-md transition-all"
    >
      {/* Portrait */}
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image
          src={doctor.photoUrl}
          alt={doctor.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          unoptimized
        />
        <div className="absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/95 text-slate-700">
          {doctor.yearsExperience} yrs
        </div>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-lg font-semibold text-slate-900 leading-snug">
          {doctor.name}
        </h3>
        <div
          className="text-sm font-medium mt-1"
          style={{ color: 'var(--primary-color)' }}
        >
          {doctor.specialty}
        </div>
        <div className="text-xs text-slate-500 mt-1">{doctor.qualifications}</div>

        <p className="text-sm text-slate-600 leading-relaxed mt-4 flex-1">
          {doctor.bio}
        </p>

        {/* Languages */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Languages
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doctor.languages.map((lang) => (
              <span
                key={lang}
                className="inline-block text-[11px] px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Consults
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((d) => {
              const active = doctor.availableDays.includes(d);
              return (
                <span
                  key={d}
                  className="text-[10px] font-semibold w-7 text-center py-1 rounded"
                  style={
                    active
                      ? { background: 'color-mix(in srgb, var(--primary-color) 12%, white)', color: 'var(--primary-color)' }
                      : { color: '#cbd5e1' }
                  }
                >
                  {DAY_LABEL[d]}
                </span>
              );
            })}
          </div>
          <div className="text-xs text-slate-500 mt-1">{doctor.availableHours}</div>
        </div>

        {/* Registration + book */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-end justify-between gap-3">
          <div className="text-[10px] text-slate-400 leading-tight">
            <div>Reg. #</div>
            <div className="font-mono text-slate-600">{doctor.registrationNo}</div>
          </div>
          <ClinicCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            productTag={doctor.id}
            prefillBody={prefillBody}
            variant="primary"
            size="sm"
            label="Book"
          />
        </div>
      </div>
    </article>
  );
}

export function RosterDoctorCards() {
  return (
    <ClinicShell id="roster" sectionId={SECTION_ID} background="white">
      <div data-theme={THEME_ID} data-section-kind="roster" data-variant={VARIANT_ID}>
        <ClinicHeading
          eyebrow="Our practitioners"
          title="Meet the team"
          subtitle="Six consultants across general medicine, paediatrics, dermatology, OBGYN, and dental. All MCI / state council registered."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CLINIC_DOCTORS.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      </div>
    </ClinicShell>
  );
}
