'use client';

import { useState, useMemo } from 'react';
import { ClinicCta, ClinicHeading, ClinicShell } from './_common';
import {
  CLINIC_DOCTORS,
  CLINIC_SLOTS,
  type AppointmentSlot,
  type DayOfWeek,
  type Doctor,
  type SlotStatus,
} from './_sampleContent';

const SECTION_ID = 'sec-schedule';
const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'slot-grid';

const DAYS: { id: DayOfWeek; short: string }[] = [
  { id: 'mon', short: 'Mon' }, { id: 'tue', short: 'Tue' }, { id: 'wed', short: 'Wed' },
  { id: 'thu', short: 'Thu' }, { id: 'fri', short: 'Fri' }, { id: 'sat', short: 'Sat' },
];

const STATUS_STYLE: Record<SlotStatus, string> = {
  available: 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 cursor-pointer',
  booked:    'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed',
  blocked:   'border-rose-200 bg-rose-50 text-rose-400 cursor-not-allowed',
};

function formatTime12(t: string): string {
  const parts = t.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parts[1] ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === '00' ? `${h12}${period}` : `${h12}:${m}${period}`;
}

function SlotChip({ slot, doctor }: { slot: AppointmentSlot; doctor: Doctor }) {
  const isAvailable = slot.status === 'available';
  const prefillBody = isAvailable
    ? [
        `Hi, I'd like to book an appointment.`,
        '',
        `• Doctor: ${doctor.name}`,
        `• Day: ${slot.dayOfWeek.toUpperCase()}`,
        `• Time: ${formatTime12(slot.startTime)}`,
      ].join('\n')
    : undefined;

  if (!isAvailable) {
    return (
      <div
        className={`flex items-center justify-center text-xs font-medium tabular-nums px-2 py-1.5 rounded border ${STATUS_STYLE[slot.status]}`}
        title={slot.status === 'blocked' ? 'Slot blocked' : 'Already booked'}
      >
        {formatTime12(slot.startTime)}
      </div>
    );
  }

  return (
    <ClinicCta
      sectionId={SECTION_ID}
      intent="book-appointment"
      productTag={slot.id}
      prefillBody={prefillBody}
      variant="outline"
      size="sm"
      className="!px-2 !py-1.5 !text-xs !rounded !border-cyan-300 !text-cyan-900 hover:!bg-cyan-50 tabular-nums"
      label={formatTime12(slot.startTime)}
    />
  );
}

function DoctorRow({ doctor, slotsByDay }: { doctor: Doctor; slotsByDay: Map<DayOfWeek, AppointmentSlot[]> }) {
  return (
    <div className="grid grid-cols-[200px_repeat(6,_1fr)] gap-2 items-start py-4 border-b border-slate-100 last:border-b-0">
      <div className="pr-4">
        <div className="text-sm font-semibold text-slate-900">{doctor.name}</div>
        <div className="text-xs text-slate-500 mt-0.5">{doctor.specialty}</div>
      </div>
      {DAYS.map((day) => {
        const slots = slotsByDay.get(day.id)?.filter((s) => s.doctorId === doctor.id) ?? [];
        return (
          <div key={day.id} className="flex flex-col gap-1.5">
            {slots.length === 0 ? (
              <div className="text-xs text-slate-300 italic px-2 py-1.5">—</div>
            ) : (
              slots.map((slot) => (
                <SlotChip key={slot.id} slot={slot} doctor={doctor} />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ScheduleSlotGrid() {
  // Group slots by day once per render.
  const slotsByDay = useMemo(() => {
    const map = new Map<DayOfWeek, AppointmentSlot[]>();
    for (const d of DAYS) map.set(d.id, []);
    for (const slot of CLINIC_SLOTS) {
      map.get(slot.dayOfWeek)?.push(slot);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, []);

  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of CLINIC_DOCTORS) set.add(d.specialty);
    return ['all', ...Array.from(set).sort()];
  }, []);

  const visibleDoctors = useMemo(
    () => (filterSpecialty === 'all'
      ? CLINIC_DOCTORS
      : CLINIC_DOCTORS.filter((d) => d.specialty === filterSpecialty)),
    [filterSpecialty],
  );

  // Count of available slots this week — drives the header CTA copy.
  const availableCount = useMemo(
    () => CLINIC_SLOTS.filter((s) => s.status === 'available').length,
    [],
  );

  return (
    <ClinicShell id="schedule" sectionId={SECTION_ID} background="white">
      <div data-theme={THEME_ID} data-section-kind="schedule" data-variant={VARIANT_ID}>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <ClinicHeading
            eyebrow="This week"
            title="Available slots"
            subtitle={`${availableCount} slots open. Tap any time to book directly on WhatsApp — we confirm within 15 minutes.`}
          />

          {/* Specialty filter */}
          <div className="inline-flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-500" htmlFor="schedule-filter">
              Filter by specialty
            </label>
            <select
              id="schedule-filter"
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="text-sm rounded-md border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All specialties' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Day headers row */}
        <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[200px_repeat(6,_1fr)] gap-2 pb-3 border-b border-slate-200 mb-2">
              <div />
              {DAYS.map((day) => (
                <div
                  key={day.id}
                  className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {day.short}
                </div>
              ))}
            </div>

            {visibleDoctors.map((doctor) => (
              <DoctorRow key={doctor.id} doctor={doctor} slotsByDay={slotsByDay} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">Status</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-cyan-300 bg-cyan-50" aria-hidden /> Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-slate-200 bg-slate-100" aria-hidden /> Booked
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-rose-200 bg-rose-50" aria-hidden /> Blocked
          </span>
        </div>
      </div>
    </ClinicShell>
  );
}
