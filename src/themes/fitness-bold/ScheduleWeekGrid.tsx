'use client';

// Schedule — fitness category, Mon-Sun × time-slot grid. Each cell
// renders the class name, instructor, duration, and a difficulty pip.
// Cells are clickable — sends a tagged WhatsApp deep-link to book that
// specific slot, so the AI agent receives `cv_product=cls-xxx` and can
// confirm availability without the visitor restating their interest.

import { BoldHeading, BoldShell, BoldCta, DifficultyPill } from './_common';
import { FITNESS_SCHEDULE, type DayOfWeek, type ScheduleSlot } from './_sampleContent';

const SECTION_ID = 'sec-schedule';
const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'week-grid';

const DAYS: { id: DayOfWeek; short: string; long: string }[] = [
  { id: 'mon', short: 'Mon', long: 'Monday'    },
  { id: 'tue', short: 'Tue', long: 'Tuesday'   },
  { id: 'wed', short: 'Wed', long: 'Wednesday' },
  { id: 'thu', short: 'Thu', long: 'Thursday'  },
  { id: 'fri', short: 'Fri', long: 'Friday'    },
  { id: 'sat', short: 'Sat', long: 'Saturday'  },
  { id: 'sun', short: 'Sun', long: 'Sunday'    },
];

function formatTime12(time24: string): string {
  const parts = time24.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const minute = parts[1] ?? '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === '00' ? `${h12} ${period}` : `${h12}:${minute} ${period}`;
}

function ScheduleCell({ slot }: { slot: ScheduleSlot }) {
  const cls = slot.gymClass;
  return (
    <div
      className="group relative p-3 mb-2 border-l-2 hover:bg-white/5 transition-colors"
      style={{ borderLeftColor: cls.difficulty.dotColor }}
      data-product-tag={cls.id}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div
          className="text-xs font-bold uppercase text-white/60"
          style={{ letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime12(slot.startTime)}
        </div>
        <div className="text-[10px] text-white/40 font-mono">
          {cls.durationMin}m
        </div>
      </div>
      <div className="text-sm font-bold text-white uppercase mb-0.5" style={{ letterSpacing: '0.02em' }}>
        {cls.name}
      </div>
      <div className="text-[11px] text-white/50 mb-2">{cls.instructor}</div>
      <DifficultyPill level={cls.difficulty.level} dotColor={cls.difficulty.dotColor} />
    </div>
  );
}

function DayColumn({ day, slots }: { day: typeof DAYS[number]; slots: readonly ScheduleSlot[] }) {
  return (
    <div className="min-w-0">
      <div
        className="sticky top-0 z-10 bg-black px-3 py-2 mb-3 border-b border-white/10"
      >
        <div className="text-[10px] font-bold uppercase text-white/40" style={{ letterSpacing: '0.18em' }}>
          {day.short}
        </div>
      </div>
      {slots.length === 0 ? (
        <div className="px-3 text-xs text-white/30 italic">Rest day</div>
      ) : (
        slots.map((slot) => <ScheduleCell key={slot.id} slot={slot} />)
      )}
    </div>
  );
}

export function ScheduleWeekGrid() {
  // Group slots by day once per render.
  const slotsByDay = new Map<DayOfWeek, ScheduleSlot[]>();
  for (const day of DAYS) slotsByDay.set(day.id, []);
  for (const slot of FITNESS_SCHEDULE) {
    slotsByDay.get(slot.dayOfWeek)?.push(slot);
  }
  for (const list of slotsByDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <BoldShell id="schedule" sectionId={SECTION_ID} background="black">
      <div data-theme={THEME_ID} data-section-kind="schedule" data-variant={VARIANT_ID}>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <BoldHeading
            eyebrow="This week"
            title="Class schedule"
            subtitle="Drop in to any class — your first week is on the house."
          />
          <BoldCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            productTag="trial-week"
            variant="filled"
            size="md"
            label="Book trial week"
          />
        </div>

        <div className="overflow-x-auto -mx-5 md:-mx-10 px-5 md:px-10 pb-4">
          <div className="grid grid-cols-7 gap-2 min-w-[920px]">
            {DAYS.map((day) => (
              <DayColumn key={day.id} day={day} slots={slotsByDay.get(day.id) ?? []} />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-5 text-[11px] text-white/50">
          <span className="font-bold uppercase tracking-wider text-white/70">Difficulty</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#60a5fa]" aria-hidden /> Beginner
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#fbbf24]" aria-hidden /> Intermediate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" aria-hidden /> Advanced
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#34d399]" aria-hidden /> All levels
          </span>
        </div>
      </div>
    </BoldShell>
  );
}
