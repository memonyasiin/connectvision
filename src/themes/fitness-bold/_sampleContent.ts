// ─────────────────────────────────────────────────────────────────────────────
// Fitness Bold — sample content
// ─────────────────────────────────────────────────────────────────────────────
// Realistic Indian gym placeholder data. Ships with the theme so the
// marketplace preview renders as a fully-populated, production-looking
// site without any backend wiring.

export interface GymStat {
  id: string;
  value: string;
  label: string;
  /** Optional sub-line below the label, e.g. "verified members". */
  sublabel?: string;
}

export interface ClassDifficulty {
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  /** Colour token name — drives the dot pip on the schedule cell. */
  dotColor: string;
}

export interface GymClass {
  id: string;
  name: string;
  instructor: string;
  durationMin: number;
  difficulty: ClassDifficulty;
  /** Brief one-line description for the schedule tooltip / drawer. */
  description?: string;
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ScheduleSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  /** 24h "HH:mm" — drives ordering on the week grid. */
  startTime: string;
  gymClass: GymClass;
}

export interface GymTestimonial {
  id: string;
  quote: string;
  authorName: string;
  /** Membership tenure — drives social proof. */
  memberSince: string;
  /** Goal achieved — drives the badge under the name. */
  achievement: string;
  /** Rotation degrees for the offset card-stack layout. */
  rotation: number;
}

export interface GymContact {
  addressLines: readonly string[];
  cityLine: string;
  phone: string;
  emergencyPhone: string;
  hours: readonly { day: string; time: string }[];
  parkingNote: string;
}

export interface GymSocial {
  platform: 'instagram' | 'youtube' | 'whatsapp' | 'facebook';
  url: string;
  label: string;
  /** Sample handle / username for display. */
  handle: string;
}

// ── Stats ────────────────────────────────────────────────────────────────────
export const FITNESS_STATS: readonly GymStat[] = [
  { id: 'stat-hours',    value: '24/7',  label: 'Open',           sublabel: 'every day, every hour' },
  { id: 'stat-trainers', value: '12+',   label: 'Trainers',       sublabel: 'IFBB & ACSM certified' },
  { id: 'stat-classes',  value: '40+',   label: 'Classes / wk',   sublabel: 'across 8 disciplines' },
  { id: 'stat-rating',   value: '4.9★',  label: 'Avg Rating',     sublabel: '600+ Google reviews' },
];

// ── Classes ──────────────────────────────────────────────────────────────────
const CLASSES: Record<string, GymClass> = {
  hiit: {
    id: 'cls-hiit', name: 'HIIT Bootcamp', instructor: 'Coach Aman', durationMin: 45,
    difficulty: { level: 'intermediate', dotColor: '#fbbf24' },
    description: 'High-intensity intervals with body-weight + kettlebell circuits.',
  },
  yoga: {
    id: 'cls-yoga', name: 'Power Yoga', instructor: 'Coach Riya', durationMin: 60,
    difficulty: { level: 'all-levels', dotColor: '#34d399' },
    description: 'Vinyasa flow with core focus. Bring your own mat.',
  },
  crossfit: {
    id: 'cls-crossfit', name: 'CrossFit WOD', instructor: 'Coach Vikas', durationMin: 60,
    difficulty: { level: 'advanced', dotColor: '#ef4444' },
    description: 'Olympic lifts + metcon. Scaling provided for newer athletes.',
  },
  spin: {
    id: 'cls-spin', name: 'Spin & Sprint', instructor: 'Coach Neha', durationMin: 45,
    difficulty: { level: 'intermediate', dotColor: '#fbbf24' },
    description: 'Indoor cycling with hills, sprints, and a finishing climb.',
  },
  mma: {
    id: 'cls-mma', name: 'MMA Conditioning', instructor: 'Coach Sameer', durationMin: 75,
    difficulty: { level: 'advanced', dotColor: '#ef4444' },
    description: 'Striking pads + grappling drills. Mouthguard required.',
  },
  strength: {
    id: 'cls-strength', name: 'Strength 101', instructor: 'Coach Karan', durationMin: 60,
    difficulty: { level: 'beginner', dotColor: '#60a5fa' },
    description: 'Squat, bench, deadlift fundamentals for new lifters.',
  },
  pilates: {
    id: 'cls-pilates', name: 'Reformer Pilates', instructor: 'Coach Meera', durationMin: 50,
    difficulty: { level: 'all-levels', dotColor: '#34d399' },
    description: 'Low-impact strength with reformer machines.',
  },
};

// Helper — keeps the SCHEDULE array readable.
function slot(day: DayOfWeek, time: string, gymClass: GymClass): ScheduleSlot {
  return { id: `slot-${day}-${time.replace(':', '')}`, dayOfWeek: day, startTime: time, gymClass };
}

// ── Schedule ─────────────────────────────────────────────────────────────────
export const FITNESS_SCHEDULE: readonly ScheduleSlot[] = [
  // Monday
  slot('mon', '06:00', CLASSES['strength']!),
  slot('mon', '07:30', CLASSES['hiit']!),
  slot('mon', '18:00', CLASSES['yoga']!),
  slot('mon', '19:30', CLASSES['crossfit']!),

  // Tuesday
  slot('tue', '06:00', CLASSES['spin']!),
  slot('tue', '07:30', CLASSES['mma']!),
  slot('tue', '18:00', CLASSES['pilates']!),
  slot('tue', '19:30', CLASSES['hiit']!),

  // Wednesday
  slot('wed', '06:00', CLASSES['strength']!),
  slot('wed', '07:30', CLASSES['yoga']!),
  slot('wed', '18:00', CLASSES['crossfit']!),
  slot('wed', '19:30', CLASSES['mma']!),

  // Thursday
  slot('thu', '06:00', CLASSES['hiit']!),
  slot('thu', '07:30', CLASSES['spin']!),
  slot('thu', '18:00', CLASSES['strength']!),
  slot('thu', '19:30', CLASSES['pilates']!),

  // Friday
  slot('fri', '06:00', CLASSES['crossfit']!),
  slot('fri', '07:30', CLASSES['hiit']!),
  slot('fri', '18:00', CLASSES['yoga']!),
  slot('fri', '19:30', CLASSES['mma']!),

  // Saturday — heavier classes
  slot('sat', '07:00', CLASSES['crossfit']!),
  slot('sat', '09:00', CLASSES['hiit']!),
  slot('sat', '11:00', CLASSES['yoga']!),
  slot('sat', '17:00', CLASSES['spin']!),

  // Sunday — lighter / recovery
  slot('sun', '08:00', CLASSES['yoga']!),
  slot('sun', '10:00', CLASSES['pilates']!),
];

// ── Testimonials ─────────────────────────────────────────────────────────────
export const FITNESS_TESTIMONIALS: readonly GymTestimonial[] = [
  {
    id: 't-1',
    quote: 'Lost 18 kg in 8 months. Coach Karan put me on a strength plan that actually fit my schedule. No nonsense, just results.',
    authorName: 'Rohit Mehta',
    memberSince: 'Member since Jan 2024',
    achievement: '−18 kg in 8 months',
    rotation: -2,
  },
  {
    id: 't-2',
    quote: 'The HIIT classes are brutal in the best way. I finally hit my 5K under 25 minutes. Best decision I made this year.',
    authorName: 'Priya Nair',
    memberSince: 'Member since Mar 2024',
    achievement: 'Sub-25 min 5K',
    rotation: 1.5,
  },
  {
    id: 't-3',
    quote: 'Open 24/7 means I can train post-night-shift. No other gym in Bandra fits a doctor schedule. Trainers actually care.',
    authorName: 'Dr. Aanya Sharma',
    memberSince: 'Member since Aug 2023',
    achievement: 'First powerlifting meet',
    rotation: -1,
  },
  {
    id: 't-4',
    quote: 'Came in skeptical of CrossFit. Six months later I deadlift 140kg. Coach Vikas knows how to scale for beginners.',
    authorName: 'Vikram Iyer',
    memberSince: 'Member since Nov 2023',
    achievement: '140 kg deadlift',
    rotation: 2,
  },
];

// ── Contact ─────────────────────────────────────────────────────────────────
export const FITNESS_CONTACT: GymContact = {
  addressLines: [
    'Powerhouse Gym, 2nd Floor',
    'Pataa Plaza, Linking Road',
  ],
  cityLine: 'Bandra West, Mumbai 400050',
  phone: '+91 9702 60 1111',
  emergencyPhone: '+91 9702 60 1199',
  hours: [
    { day: 'Monday – Sunday', time: 'Open 24 hours' },
  ],
  parkingNote: 'Free 2-hr parking validated at reception.',
};

// ── Social ──────────────────────────────────────────────────────────────────
export const FITNESS_SOCIAL: readonly GymSocial[] = [
  { platform: 'instagram', url: 'https://instagram.com/powerhouse-mumbai', label: 'Instagram', handle: '@powerhouse.mumbai' },
  { platform: 'youtube',   url: 'https://youtube.com/@powerhousegym',      label: 'YouTube',   handle: '@powerhousegym'    },
  { platform: 'whatsapp',  url: 'https://wa.me/919702601111',              label: 'WhatsApp',  handle: '+91 9702 60 1111'  },
  { platform: 'facebook',  url: 'https://facebook.com/powerhouse-mumbai',  label: 'Facebook',  handle: 'powerhouse.mumbai' },
];

// ── Instagram reel placeholders (for FooterSocialHeavy) ─────────────────────
// 6 Unsplash gym shots used as reel-thumbnail placeholders. Real deployment
// swaps these for actual IG reel embeds.
export const FITNESS_REEL_THUMBS: readonly { id: string; src: string; alt: string }[] = [
  { id: 'reel-1', src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', alt: 'Squat session' },
  { id: 'reel-2', src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80', alt: 'Pull-up bar' },
  { id: 'reel-3', src: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80', alt: 'Box jump' },
  { id: 'reel-4', src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', alt: 'Yoga class' },
  { id: 'reel-5', src: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80', alt: 'Sprint training' },
  { id: 'reel-6', src: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', alt: 'Kettlebell swing' },
];
