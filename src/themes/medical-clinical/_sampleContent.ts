// ─────────────────────────────────────────────────────────────────────────────
// Medical Clinical — sample content
// ─────────────────────────────────────────────────────────────────────────────
// Realistic Indian clinic placeholder data. Conservative naming, NABH /
// MCI / DCI references that read as authentic to Indian patients +
// regulators. Ships with the theme so the marketplace preview is a
// fully-populated trust-first clinic site without backend wiring.

// ── Trust signals ────────────────────────────────────────────────────────────

export interface TrustSignal {
  id: string;
  label: string;
  /** Short qualifier — e.g. "since 2014". */
  qualifier?: string;
}

export const CLINIC_TRUST_SIGNALS: readonly TrustSignal[] = [
  { id: 'ts-nabh',     label: 'NABH-accredited',     qualifier: 'since 2018'    },
  { id: 'ts-iso',      label: 'ISO 9001:2015',        qualifier: 'recertified 2024' },
  { id: 'ts-mci',      label: 'MCI-registered',       qualifier: '6 practitioners'  },
  { id: 'ts-years',    label: '12+ years',            qualifier: 'in practice'      },
  { id: 'ts-patients', label: '10,000+ patients',     qualifier: 'served'           },
  { id: 'ts-rating',   label: '4.8 ★',                qualifier: 'on Google'        },
];

// ── Treatments / services ────────────────────────────────────────────────────

export interface MedicalService {
  id: string;
  name: string;
  description: string;
  /** Display label only; not for billing. */
  priceLabel: string;
  durationMin: number;
  /** Category — used for grouping/filtering in future MODULE 6+. */
  category: 'general' | 'paediatric' | 'dermatology' | 'diagnostic' | 'preventive' | 'dental';
}

export const CLINIC_SERVICES: readonly MedicalService[] = [
  { id: 'svc-gen-consult',  name: 'General consultation',     description: 'Initial workup with one of our MBBS, MD consultants. Includes history, examination, and prescription.', priceLabel: '₹500',       durationMin: 20, category: 'general'     },
  { id: 'svc-paed-consult', name: 'Paediatric consultation',  description: 'Newborn to 16 years. By appointment with DCH-qualified paediatrician.',                                priceLabel: '₹600',       durationMin: 25, category: 'paediatric'  },
  { id: 'svc-derma',        name: 'Dermatology consultation', description: 'Skin, hair, nail. MD-qualified dermatologist. Includes Wood\'s lamp + dermoscopy if needed.',          priceLabel: '₹800',       durationMin: 30, category: 'dermatology' },
  { id: 'svc-vaccines',     name: 'Vaccinations',             description: 'Adult + paediatric. Routine + travel + flu shots. All vaccines from cold-chain certified suppliers.', priceLabel: 'from ₹450',  durationMin: 15, category: 'preventive'  },
  { id: 'svc-bloodwork',    name: 'Basic blood work',         description: 'CBC, lipid profile, HbA1c, thyroid panel. Reports via secure WhatsApp within 24 hours.',              priceLabel: 'from ₹600',  durationMin: 15, category: 'diagnostic'  },
  { id: 'svc-ecg',          name: 'ECG + interpretation',     description: '12-lead resting ECG with consultant-reviewed report. Walk-in service Monday to Friday.',               priceLabel: '₹500',       durationMin: 20, category: 'diagnostic'  },
  { id: 'svc-skin-treat',   name: 'Cosmetic skin treatments', description: 'Acne, pigmentation, chemical peels. Procedure pricing on consultation.',                               priceLabel: 'on consult', durationMin: 45, category: 'dermatology' },
  { id: 'svc-dental',       name: 'Dental consultation',      description: 'Scaling, cleaning, basic restorations. Major work referred to in-house BDS, MDS specialist.',          priceLabel: '₹400',       durationMin: 30, category: 'dental'      },
];

// ── Doctors ──────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  name: string;
  /** Stacked qualifications, e.g. "MBBS, MD". */
  qualifications: string;
  specialty: string;
  yearsExperience: number;
  /** ISO-style language codes for the chip list. */
  languages: readonly string[];
  /** Days they consult, as DayOfWeek-like keys. */
  availableDays: readonly ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[];
  /** Time bracket — display only. */
  availableHours: string;
  /** MCI / state council registration number — visible for trust. */
  registrationNo: string;
  /** Public-domain Unsplash portrait placeholder. */
  photoUrl: string;
  /** Short bio for the doctor card. */
  bio: string;
}

export const CLINIC_DOCTORS: readonly Doctor[] = [
  {
    id: 'doc-aanya',
    name: 'Dr. Aanya Sharma',
    qualifications: 'MBBS, MD (Internal Medicine)',
    specialty: 'General Medicine',
    yearsExperience: 12,
    languages: ['English', 'Hindi', 'Marathi'],
    availableDays: ['mon', 'wed', 'fri'],
    availableHours: '9:00 am – 1:00 pm',
    registrationNo: 'MMC 56723',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    bio: 'General physician with a focus on chronic-disease management. Co-lead of the clinic\'s diabetes care programme.',
  },
  {
    id: 'doc-vikram',
    name: 'Dr. Vikram Iyer',
    qualifications: 'MBBS, DCH, MD (Paediatrics)',
    specialty: 'Paediatrics',
    yearsExperience: 18,
    languages: ['English', 'Hindi', 'Tamil'],
    availableDays: ['tue', 'thu', 'sat'],
    availableHours: '10:00 am – 1:00 pm, 6:00 pm – 8:00 pm',
    registrationNo: 'MMC 41209',
    photoUrl: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400&q=80',
    bio: 'Paediatrician for newborns to adolescents. Routine well-child visits, vaccinations, and developmental screening.',
  },
  {
    id: 'doc-priya',
    name: 'Dr. Priya Nair',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    specialty: 'Dermatology',
    yearsExperience: 10,
    languages: ['English', 'Hindi', 'Malayalam'],
    availableDays: ['mon', 'tue', 'thu'],
    availableHours: '11:00 am – 1:00 pm, 5:00 pm – 9:00 pm',
    registrationNo: 'MMC 68842',
    photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
    bio: 'Medical and aesthetic dermatology. Special interest in adult acne, melasma, and patch testing.',
  },
  {
    id: 'doc-rohit',
    name: 'Dr. Rohit Mehta',
    qualifications: 'MBBS, MD (Family Medicine)',
    specialty: 'General Medicine',
    yearsExperience: 8,
    languages: ['English', 'Hindi', 'Gujarati'],
    availableDays: ['wed', 'fri', 'sat'],
    availableHours: '5:00 pm – 9:00 pm',
    registrationNo: 'MMC 73104',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    bio: 'Family medicine with emphasis on preventive health screenings and lifestyle counselling.',
  },
  {
    id: 'doc-meera',
    name: 'Dr. Meera Kapoor',
    qualifications: 'MBBS, DGO, MD (OBGYN)',
    specialty: 'Obstetrics & Gynaecology',
    yearsExperience: 15,
    languages: ['English', 'Hindi'],
    availableDays: ['mon', 'wed', 'sat'],
    availableHours: '10:00 am – 1:00 pm',
    registrationNo: 'MMC 51289',
    photoUrl: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80',
    bio: 'Antenatal care, contraception counselling, menopause support. Routine pap smears and screening colposcopy.',
  },
  {
    id: 'doc-karan',
    name: 'Dr. Karan Bhatia',
    qualifications: 'BDS, MDS (Conservative Dentistry & Endodontics)',
    specialty: 'Dental Surgery',
    yearsExperience: 6,
    languages: ['English', 'Hindi', 'Punjabi'],
    availableDays: ['tue', 'thu', 'fri'],
    availableHours: '11:00 am – 1:00 pm, 6:00 pm – 8:00 pm',
    registrationNo: 'MSDC 23901',
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80',
    bio: 'Root canal, smile design, and restorative work. Special focus on pain-free paediatric dentistry.',
  },
];

// ── Appointment schedule slots ───────────────────────────────────────────────
// 30-minute slot grid per doctor per available day. Status flags drive
// the cell colour in ScheduleSlotGrid.

export type SlotStatus = 'available' | 'booked' | 'blocked';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface AppointmentSlot {
  id: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;       // 24h "HH:mm"
  status: SlotStatus;
}

// Helper to keep the array readable.
function slot(doctorId: string, day: DayOfWeek, time: string, status: SlotStatus = 'available'): AppointmentSlot {
  return { id: `slot-${doctorId}-${day}-${time.replace(':', '')}`, doctorId, dayOfWeek: day, startTime: time, status };
}

export const CLINIC_SLOTS: readonly AppointmentSlot[] = [
  // Dr. Aanya — Mon/Wed/Fri morning
  slot('doc-aanya', 'mon', '09:00'),           slot('doc-aanya', 'mon', '09:30', 'booked'),
  slot('doc-aanya', 'mon', '10:00'),           slot('doc-aanya', 'mon', '10:30'),
  slot('doc-aanya', 'mon', '11:00', 'booked'), slot('doc-aanya', 'mon', '11:30'),
  slot('doc-aanya', 'wed', '09:00'),           slot('doc-aanya', 'wed', '09:30'),
  slot('doc-aanya', 'wed', '10:00', 'booked'), slot('doc-aanya', 'wed', '10:30'),
  slot('doc-aanya', 'fri', '09:00'),           slot('doc-aanya', 'fri', '09:30'),
  slot('doc-aanya', 'fri', '10:00'),           slot('doc-aanya', 'fri', '10:30', 'booked'),

  // Dr. Vikram — Tue/Thu/Sat split shift
  slot('doc-vikram', 'tue', '10:00', 'booked'), slot('doc-vikram', 'tue', '10:30'),
  slot('doc-vikram', 'tue', '11:00'),           slot('doc-vikram', 'tue', '11:30', 'booked'),
  slot('doc-vikram', 'tue', '18:00'),           slot('doc-vikram', 'tue', '18:30'),
  slot('doc-vikram', 'thu', '10:00'),           slot('doc-vikram', 'thu', '10:30'),
  slot('doc-vikram', 'thu', '18:00', 'blocked'),slot('doc-vikram', 'thu', '18:30', 'blocked'),
  slot('doc-vikram', 'sat', '10:00'),           slot('doc-vikram', 'sat', '10:30', 'booked'),
  slot('doc-vikram', 'sat', '11:00'),           slot('doc-vikram', 'sat', '11:30'),

  // Dr. Priya — Mon/Tue/Thu split
  slot('doc-priya', 'mon', '11:00'),            slot('doc-priya', 'mon', '11:30'),
  slot('doc-priya', 'mon', '17:00', 'booked'),  slot('doc-priya', 'mon', '17:30'),
  slot('doc-priya', 'tue', '11:00', 'booked'),  slot('doc-priya', 'tue', '11:30'),
  slot('doc-priya', 'tue', '17:00'),            slot('doc-priya', 'tue', '17:30'),
  slot('doc-priya', 'thu', '17:00'),            slot('doc-priya', 'thu', '17:30', 'booked'),
  slot('doc-priya', 'thu', '18:00'),            slot('doc-priya', 'thu', '18:30'),

  // Dr. Rohit — Wed/Fri/Sat evening
  slot('doc-rohit', 'wed', '17:00'),            slot('doc-rohit', 'wed', '17:30'),
  slot('doc-rohit', 'wed', '18:00', 'booked'),  slot('doc-rohit', 'wed', '18:30'),
  slot('doc-rohit', 'fri', '17:00'),            slot('doc-rohit', 'fri', '17:30'),
  slot('doc-rohit', 'sat', '17:00', 'booked'),  slot('doc-rohit', 'sat', '17:30'),

  // Dr. Meera — Mon/Wed/Sat morning
  slot('doc-meera', 'mon', '10:00'),            slot('doc-meera', 'mon', '10:30', 'booked'),
  slot('doc-meera', 'wed', '11:00'),            slot('doc-meera', 'wed', '11:30'),
  slot('doc-meera', 'sat', '10:00', 'booked'),  slot('doc-meera', 'sat', '10:30'),
  slot('doc-meera', 'sat', '12:00'),            slot('doc-meera', 'sat', '12:30'),

  // Dr. Karan — Tue/Thu/Fri split
  slot('doc-karan', 'tue', '11:00'),            slot('doc-karan', 'tue', '11:30', 'booked'),
  slot('doc-karan', 'thu', '11:00'),            slot('doc-karan', 'thu', '11:30'),
  slot('doc-karan', 'thu', '18:00', 'booked'),  slot('doc-karan', 'thu', '18:30'),
  slot('doc-karan', 'fri', '18:00'),            slot('doc-karan', 'fri', '18:30'),
];

// ── Contact ─────────────────────────────────────────────────────────────────

export interface ClinicHours {
  day: string;
  time: string;
  /** Emergency-only days, displayed in a separate visual treatment. */
  emergencyOnly?: boolean;
}

export interface ClinicContact {
  addressLines: readonly string[];
  cityLine: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  hours: readonly ClinicHours[];
  mapEmbedUrl: string;
  /** Compliance line for the footer. */
  registrationLine: string;
  /** Optional accessibility note (wheelchair access, lift, etc). */
  accessibilityNote: string;
}

export const CLINIC_CONTACT: ClinicContact = {
  addressLines: [
    'Sunshine Clinic, 2nd Floor',
    'Pataa Square, Marol-Maroshi Road',
  ],
  cityLine: 'Andheri East, Mumbai 400059, Maharashtra',
  phone: '+91 9702 60 1111',
  emergencyPhone: '+91 9702 60 1199',
  email: 'reception@example.com',
  hours: [
    { day: 'Monday – Friday', time: '9:00 am – 9:00 pm' },
    { day: 'Saturday',        time: '9:00 am – 6:00 pm' },
    { day: 'Sunday',          time: 'Emergency only — call ahead', emergencyOnly: true },
  ],
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.236!2d72.8728!3d19.1135!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDA2JzQ4LjYiTiA3MsKwNTInMjIuMSJF!5e0!3m2!1sen!2sin!4v1717180000000',
  registrationLine:
    'Sunshine Clinic Pvt. Ltd. · Maharashtra Medical Council #SCN-2018-44291 · NABH-accredited (cert MH-EH-2018-04217)',
  accessibilityNote: 'Wheelchair accessible. Lift access from ground floor. Free patient parking — please use Block B.',
};
