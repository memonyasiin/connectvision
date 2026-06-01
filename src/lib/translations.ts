// ─────────────────────────────────────────────────────────────────────────────
// Localization Dictionary
// ─────────────────────────────────────────────────────────────────────────────
// Three locales:
//   en-IN       — English (India)
//   hi-IN       — Shudh Hindi (Devanagari script)
//   hi-IN-Latn  — Hinglish (Hindi grammar, Latin script — mass-market default)
//
// Keys are namespaced by domain (`appointment.status.confirmed`, etc.) so
// every consumer (CalendarGrid, AppointmentDrawer, notificationEngine) can
// look up the locale-correct string without touching switch statements.
//
// Templates use `{{var}}` placeholders. `t()` interpolates with HTML-escape
// off (the consumer is responsible — these strings flow into SMS / WhatsApp
// bodies and trusted JSX text).

export type Locale = 'en-IN' | 'hi-IN' | 'hi-IN-Latn';

export const LOCALES: readonly Locale[] = ['en-IN', 'hi-IN', 'hi-IN-Latn'] as const;

export type TranslationKey =
  // appointment status labels
  | 'appointment.status.available'
  | 'appointment.status.pending'
  | 'appointment.status.confirmed'
  | 'appointment.status.completed'
  | 'appointment.status.cancelled'
  | 'appointment.status.no_show'
  // calendar shell
  | 'calendar.title'
  | 'calendar.today'
  | 'calendar.no_slots'
  | 'calendar.week_of'
  // drawer
  | 'drawer.heading'
  | 'drawer.customer'
  | 'drawer.service'
  | 'drawer.duration'
  | 'drawer.payment'
  | 'drawer.payment_received'
  | 'drawer.payment_pending'
  | 'drawer.upi_ref'
  | 'drawer.pataa_link'
  | 'drawer.no_payment_yet'
  | 'drawer.notes'
  | 'drawer.close'
  // notification templates
  | 'notify.confirmation.subject'
  | 'notify.confirmation.body'
  | 'notify.reminder_30min.subject'
  | 'notify.reminder_30min.body'
  | 'notify.reminder_1h.subject'
  | 'notify.reminder_1h.body'
  | 'notify.cancelled.subject'
  | 'notify.cancelled.body'
  // workforce alerts
  | 'notify.ghost_state.subject'
  | 'notify.ghost_state.body'
  | 'notify.leave_breach.subject'
  | 'notify.leave_breach.body'
  | 'notify.slot_updated.subject'
  | 'notify.slot_updated.body'
  // customer retention broadcasts (Phase 5 CV_CustomerLedger scanner)
  | 'notify.customer.churn_risk.subject'
  | 'notify.customer.churn_risk.body'
  | 'notify.customer.overdue_recall.subject'
  | 'notify.customer.overdue_recall.body';

type Dictionary = Record<TranslationKey, string>;

const DICTIONARIES: Record<Locale, Dictionary> = {
  // ── English (India) ────────────────────────────────────────────────────────
  'en-IN': {
    'appointment.status.available':  'Available',
    'appointment.status.pending':    'Pending checkout',
    'appointment.status.confirmed':  'Confirmed',
    'appointment.status.completed':  'Completed',
    'appointment.status.cancelled':  'Cancelled',
    'appointment.status.no_show':    'No-show',
    'calendar.title':                'Appointments',
    'calendar.today':                'Today',
    'calendar.no_slots':             'No slots scheduled for this day.',
    'calendar.week_of':              'Week of {{date}}',
    'drawer.heading':                'Appointment detail',
    'drawer.customer':               'Customer',
    'drawer.service':                'Service',
    'drawer.duration':               'Duration',
    'drawer.payment':                'Payment',
    'drawer.payment_received':       'Received {{amount}} via UPI',
    'drawer.payment_pending':        'Checkout in progress',
    'drawer.upi_ref':                'UPI ref',
    'drawer.pataa_link':             'Open in Pataa CRM',
    'drawer.no_payment_yet':         'No payment captured yet',
    'drawer.notes':                  'Notes',
    'drawer.close':                  'Close',
    'notify.confirmation.subject':   'Booking confirmed at {{business}}',
    'notify.confirmation.body':      'Hi {{name}}, your {{service}} booking on {{when}} at {{business}} is confirmed. Reply CANCEL to cancel.',
    'notify.reminder_30min.subject': 'Reminder: appointment in 30 minutes',
    'notify.reminder_30min.body':    'Hi {{name}}, your {{service}} at {{business}} is in 30 minutes. See you soon!',
    'notify.reminder_1h.subject':    'Reminder: appointment in 1 hour',
    'notify.reminder_1h.body':       'Hi {{name}}, your {{service}} at {{business}} is in 1 hour.',
    'notify.cancelled.subject':      'Booking cancelled',
    'notify.cancelled.body':         'Hi {{name}}, your booking at {{business}} has been cancelled. Refund (if applicable) will be processed.',
    'notify.ghost_state.subject':    'Ghost-state alert: {{employee}}',
    'notify.ghost_state.body':       'No productive activity detected for {{employee}} in the last {{window}} minutes during an active shift. Please verify.',
    'notify.leave_breach.subject':   'Leave breach: {{employee}}',
    'notify.leave_breach.body':      '{{employee}} has not returned from leave (ended {{leaveEnd}}) and no secondary authorization was recorded. Auto-flagged OVERDUE_ABSENT.',
    'notify.slot_updated.subject':   'Slot updated: {{service}}',
    'notify.slot_updated.body':      'Hi {{name}}, your {{service}} slot at {{business}} has been rescheduled to {{when}}.',
    'notify.customer.churn_risk.subject':     'We miss you at {{business}}',
    'notify.customer.churn_risk.body':        'Hi {{name}}, it has been {{days}} days since your last visit to {{business}}. We have been thinking of you — drop by anytime and we will look after you.',
    'notify.customer.overdue_recall.subject': 'Your service interval at {{business}} is overdue',
    'notify.customer.overdue_recall.body':    'Hi {{name}}, your last service interval check at {{business}} is overdue ({{days}} days). Reply YES and we will set aside a slot for you this week — plus a returning-guest treat to thank you for coming back.',
  },

  // ── Shudh Hindi (Devanagari) ───────────────────────────────────────────────
  'hi-IN': {
    'appointment.status.available':  'उपलब्ध',
    'appointment.status.pending':    'भुगतान शेष',
    'appointment.status.confirmed':  'पुष्टि',
    'appointment.status.completed':  'पूर्ण',
    'appointment.status.cancelled':  'रद्द',
    'appointment.status.no_show':    'अनुपस्थित',
    'calendar.title':                'अपॉइंटमेंट्स',
    'calendar.today':                'आज',
    'calendar.no_slots':             'इस दिन कोई स्लॉट नहीं है।',
    'calendar.week_of':              'सप्ताह: {{date}}',
    'drawer.heading':                'अपॉइंटमेंट विवरण',
    'drawer.customer':               'ग्राहक',
    'drawer.service':                'सेवा',
    'drawer.duration':               'अवधि',
    'drawer.payment':                'भुगतान',
    'drawer.payment_received':       'UPI से {{amount}} प्राप्त',
    'drawer.payment_pending':        'चेकआउट जारी है',
    'drawer.upi_ref':                'UPI सन्दर्भ',
    'drawer.pataa_link':             'Pataa CRM में देखें',
    'drawer.no_payment_yet':         'अभी कोई भुगतान नहीं',
    'drawer.notes':                  'नोट्स',
    'drawer.close':                  'बंद करें',
    'notify.confirmation.subject':   '{{business}} पर बुकिंग पुष्टि',
    'notify.confirmation.body':      'नमस्ते {{name}}, {{business}} पर {{when}} के लिए आपकी {{service}} बुकिंग पुष्टि हो गई है।',
    'notify.reminder_30min.subject': 'याद दिलाएँ: 30 मिनट में अपॉइंटमेंट',
    'notify.reminder_30min.body':    'नमस्ते {{name}}, {{business}} पर आपकी {{service}} 30 मिनट में है।',
    'notify.reminder_1h.subject':    'याद दिलाएँ: 1 घंटे में अपॉइंटमेंट',
    'notify.reminder_1h.body':       'नमस्ते {{name}}, {{business}} पर आपकी {{service}} 1 घंटे में है।',
    'notify.cancelled.subject':      'बुकिंग रद्द',
    'notify.cancelled.body':         'नमस्ते {{name}}, {{business}} पर आपकी बुकिंग रद्द कर दी गई है।',
    'notify.ghost_state.subject':    'ध्यान दें: {{employee}} सक्रिय नहीं',
    'notify.ghost_state.body':       'पिछले {{window}} मिनटों में {{employee}} की कोई गतिविधि दर्ज नहीं हुई। कृपया जाँच करें।',
    'notify.leave_breach.subject':   'अवकाश उल्लंघन: {{employee}}',
    'notify.leave_breach.body':      '{{employee}} अवकाश से वापस नहीं लौटे (समाप्त: {{leaveEnd}})। द्वितीय प्राधिकरण नहीं पाया गया। स्थिति: OVERDUE_ABSENT।',
    'notify.slot_updated.subject':   'समय परिवर्तन: {{service}}',
    'notify.slot_updated.body':      'नमस्ते {{name}}, आपकी {{service}} का समय {{when}} पर बदल दिया गया है।',
    'notify.customer.churn_risk.subject':     '{{business}} पर आपकी कमी महसूस हो रही है',
    'notify.customer.churn_risk.body':        'नमस्ते {{name}}, आपकी पिछली {{business}} विज़िट को {{days}} दिन हो गए हैं। हमें आपकी याद आ रही है — जब भी समय हो, ज़रूर पधारिए।',
    'notify.customer.overdue_recall.subject': '{{business}} पर आपकी सेवा का समय बीत चुका है',
    'notify.customer.overdue_recall.body':    'नमस्ते {{name}}, {{business}} पर आपकी अंतिम सेवा को {{days}} दिन हो चुके हैं — अब अगली विज़िट का समय है। उत्तर में YES भेजिए, इस सप्ताह एक स्लॉट और एक विशेष उपहार आपके लिए सुरक्षित कर दिया जाएगा।',
  },

  // ── Hinglish (Hindi grammar, Latin script — mass market) ──────────────────
  'hi-IN-Latn': {
    'appointment.status.available':  'Available',
    'appointment.status.pending':    'Payment pending',
    'appointment.status.confirmed':  'Confirmed',
    'appointment.status.completed':  'Ho gaya',
    'appointment.status.cancelled':  'Cancel',
    'appointment.status.no_show':    'Aaya nahi',
    'calendar.title':                'Appointments',
    'calendar.today':                'Aaj',
    'calendar.no_slots':             'Is din ke liye koi slot nahi hai.',
    'calendar.week_of':              'Hafta: {{date}}',
    'drawer.heading':                'Appointment ki details',
    'drawer.customer':               'Customer',
    'drawer.service':                'Service',
    'drawer.duration':               'Duration',
    'drawer.payment':                'Payment',
    'drawer.payment_received':       '{{amount}} UPI se mil gaya',
    'drawer.payment_pending':        'Checkout chal raha hai',
    'drawer.upi_ref':                'UPI ref',
    'drawer.pataa_link':             'Pataa CRM me kholo',
    'drawer.no_payment_yet':         'Abhi tak payment nahi aaya',
    'drawer.notes':                  'Notes',
    'drawer.close':                  'Band karo',
    'notify.confirmation.subject':   '{{business}} pe booking confirm',
    'notify.confirmation.body':      'Hi {{name}}, {{business}} pe {{when}} ki {{service}} booking confirm ho gayi hai. Reply CANCEL to cancel.',
    'notify.reminder_30min.subject': 'Sirf 30 mins bache hain',
    'notify.reminder_30min.body':    'Sirf 30 mins bache hain aapke appointment me! Details: {{service}} at {{business}}, {{when}}. Time pe aa jaaiye!',
    'notify.reminder_1h.subject':    '1 ghante me appointment',
    'notify.reminder_1h.body':       'Hi {{name}}, 1 ghante me {{business}} pe aapki {{service}} hai. See you soon!',
    'notify.cancelled.subject':      'Booking cancel ho gayi',
    'notify.cancelled.body':         'Hi {{name}}, {{business}} pe aapki booking cancel ho gayi hai. Refund (agar lagu hota hai) process kar dia jayega.',
    'notify.ghost_state.subject':    'Alert: {{employee}} active nahi',
    'notify.ghost_state.body':       'Last {{window}} mins me {{employee}} ki koi activity nahi mili — shift active hai. Ek baar check kar lijiye.',
    'notify.leave_breach.subject':   'Leave breach: {{employee}}',
    'notify.leave_breach.body':      '{{employee}} leave se wapas nahi aaye (end: {{leaveEnd}}) aur koi secondary auth nahi mila. Status auto-flag: OVERDUE_ABSENT.',
    'notify.slot_updated.subject':   'Time change: {{service}}',
    'notify.slot_updated.body':      'Hi {{name}}, aapki {{service}} ka time {{business}} pe ab {{when}} hai. Confirm karne ke liye reply kijiye.',
    'notify.customer.churn_risk.subject':     '{{business}} pe aapki kami mehsoos ho rahi hai',
    'notify.customer.churn_risk.body':        'Hi {{name}}, aapki {{business}} pe last visit ko {{days}} din ho gaye hain. Hum aapko miss kar rahe hain — jab time ho aa jaaiye, hamesha jaisa khayal rakhenge.',
    'notify.customer.overdue_recall.subject': '{{business}} ka service interval overdue hai',
    'notify.customer.overdue_recall.body':    'Hi {{name}}, aapka last service interval check {{business}} pe overdue hai — {{days}} din ho gaye. YES reply kijiye, is hafte ka ek slot aur ek special returning-guest gift aapke liye reserve kar denge.',
  },
};

/**
 * Translate a key with optional `{{var}}` interpolation.
 * Falls back to English if the locale dictionary is missing the key.
 */
export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES['en-IN'];
  const template = dict[key] ?? DICTIONARIES['en-IN'][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Coerce a stored locale (which may be null / unknown) to a valid Locale.
 * Used wherever we read `customerLocale` from the DB.
 */
export function resolveLocale(stored: string | null | undefined): Locale {
  if (stored === 'en-IN' || stored === 'hi-IN' || stored === 'hi-IN-Latn') return stored;
  return 'hi-IN-Latn'; // mass-market default for India
}
