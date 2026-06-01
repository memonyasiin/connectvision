// ─────────────────────────────────────────────────────────────────────────────
// Skincare Luxe — sample content
// ─────────────────────────────────────────────────────────────────────────────
// Mock data the components fall back to when their content isn't supplied
// by BuildContext. Ships with the theme so the Envato/ThemeForest preview
// renders as a fully-populated, production-looking site out of the box.
//
// SaaS Tier integration plan: when BusinessData is extended with optional
// `services` / `testimonials` / `gallery` / `contactInfo` arrays, each
// variant will prefer those over these fallbacks. Until that extension
// lands, these constants drive the live demo.

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  durationLabel: string;
  /** lucide-react icon name; consumer maps to <Icon name={iconName}/> */
  iconName: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  authorName: string;
  authorLocation: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  /** Aspect ratio for masonry layout — 'tall' | 'wide' | 'square'. */
  aspect: 'tall' | 'wide' | 'square';
}

export interface ContactInfo {
  addressLines: readonly string[];
  cityLine: string;
  phone: string;
  email: string;
  hours: readonly { day: string; time: string }[];
  mapEmbedUrl: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'youtube' | 'whatsapp';
  url: string;
  label: string;
}

// ── Services ─────────────────────────────────────────────────────────────────
export const SKINCARE_SERVICES: readonly ServiceItem[] = [
  {
    id: 'svc-hydrating-facial',
    title: 'Hydrating Facial',
    description: '60-minute deep cleanse + glow ritual. Includes steam, extraction, and a hyaluronic acid mask.',
    priceLabel: '₹1,499',
    durationLabel: '60 min',
    iconName: 'droplet',
  },
  {
    id: 'svc-consultation',
    title: 'Skin Consultation',
    description: '30-minute 1:1 with a certified esthetician. Get a personalized routine + product list to take home.',
    priceLabel: '₹499',
    durationLabel: '30 min',
    iconName: 'sparkles',
  },
  {
    id: 'svc-bridal-trial',
    title: 'Bridal Trial',
    description: 'Pre-bridal glow protocol. Skin prep + base trial + 30-day at-home routine.',
    priceLabel: '₹4,999',
    durationLabel: '90 min',
    iconName: 'flower',
  },
  {
    id: 'svc-hair-spa',
    title: 'Hair Spa',
    description: 'Argan oil scalp ritual + steam + deep conditioning mask. Walks out with mirror-shine hair.',
    priceLabel: '₹2,200',
    durationLabel: '75 min',
    iconName: 'wind',
  },
  {
    id: 'svc-anti-aging',
    title: 'Anti-Aging Protocol',
    description: 'LED + microcurrent facial. Visible lift in 6 sessions. First session 50% off for new clients.',
    priceLabel: '₹3,499',
    durationLabel: '75 min',
    iconName: 'star',
  },
  {
    id: 'svc-express-manicure',
    title: 'Express Manicure',
    description: 'Cuticle care + buff + nourishing massage + your choice of polish.',
    priceLabel: '₹699',
    durationLabel: '30 min',
    iconName: 'hand',
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
export const SKINCARE_TESTIMONIALS: readonly TestimonialItem[] = [
  {
    id: 'tst-1',
    quote: 'My skin has never felt this calm. Three sessions in and friends keep asking what changed.',
    authorName: 'Aanya Sharma',
    authorLocation: 'Bandra West',
    rating: 5,
  },
  {
    id: 'tst-2',
    quote: 'Booked the bridal trial four months before the wedding. Best decision — woke up glowing on the day.',
    authorName: 'Priya Nair',
    authorLocation: 'Andheri East',
    rating: 5,
  },
  {
    id: 'tst-3',
    quote: 'Honest consultation, no upselling. They told me to use less product, not more. Trust earned.',
    authorName: 'Vikram Iyer',
    authorLocation: 'Powai',
    rating: 5,
  },
  {
    id: 'tst-4',
    quote: 'The WhatsApp consult before my first visit saved me so much time. Walked in already knowing what I wanted.',
    authorName: 'Meera Kapoor',
    authorLocation: 'Khar West',
    rating: 5,
  },
  {
    id: 'tst-5',
    quote: 'Anti-aging protocol works. Six sessions, real lift. My makeup artist noticed the difference first.',
    authorName: 'Rohit Mehta',
    authorLocation: 'Juhu',
    rating: 4,
  },
];

// ── Gallery ─────────────────────────────────────────────────────────────────
// Unsplash CDN — these images are licensed for marketplace preview use. SaaS
// tenants replace with their own gallery on signup.
export const SKINCARE_GALLERY: readonly GalleryImage[] = [
  { id: 'g-1', src: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80', alt: 'Skincare studio interior',     aspect: 'tall'   },
  { id: 'g-2', src: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',     alt: 'Facial treatment in progress', aspect: 'square' },
  { id: 'g-3', src: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80', alt: 'Spa product flat-lay',         aspect: 'wide'   },
  { id: 'g-4', src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', alt: 'Botanical close-up',            aspect: 'tall'   },
  { id: 'g-5', src: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80', alt: 'Spa towel + diffuser',         aspect: 'square' },
  { id: 'g-6', src: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=80', alt: 'Calming candle still-life',     aspect: 'wide'   },
  { id: 'g-7', src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', alt: 'Yoga + wellness shoot',         aspect: 'tall'   },
  { id: 'g-8', src: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', alt: 'Hand close-up post-manicure',   aspect: 'square' },
];

// ── Contact ─────────────────────────────────────────────────────────────────
export const SKINCARE_CONTACT: ContactInfo = {
  addressLines: [
    'Ground Floor, Pataa House',
    'Linking Road, Bandra West',
  ],
  cityLine: 'Mumbai 400050, Maharashtra',
  phone: '+91 9702 60 1111',
  email: 'hello@example.com',
  hours: [
    { day: 'Monday – Saturday', time: '10:00 am – 8:00 pm' },
    { day: 'Sunday',            time: '11:00 am – 6:00 pm' },
  ],
  // Bandra West coordinates → Google Maps embed.
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.236!2d72.8295!3d19.0594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzMzLjkiTiA3MsKwNDknNDYuMiJF!5e0!3m2!1sen!2sin!4v1717180000000',
};

// ── Social ──────────────────────────────────────────────────────────────────
export const SKINCARE_SOCIAL: readonly SocialLink[] = [
  { platform: 'instagram', url: 'https://instagram.com/example', label: 'Instagram' },
  { platform: 'whatsapp',  url: 'https://wa.me/919702601111',    label: 'WhatsApp'  },
  { platform: 'facebook',  url: 'https://facebook.com/example',  label: 'Facebook'  },
  { platform: 'youtube',   url: 'https://youtube.com/example',   label: 'YouTube'   },
];
