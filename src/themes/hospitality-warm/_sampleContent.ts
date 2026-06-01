// ─────────────────────────────────────────────────────────────────────────────
// Hospitality Warm — sample content
// ─────────────────────────────────────────────────────────────────────────────
// Realistic Awadhi / Mughlai restaurant placeholder data (mirrors the
// 'rasoi-by-anand' sample build from MODULE 1). Ships with the theme so
// the marketplace preview reads as a fully-populated dining-room site
// without any backend wiring.

export interface MenuCategory {
  id: string;
  label: string;
  /** Short eyebrow description shown under the tab header. */
  blurb?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceInr: number;
  /** Optional dietary tags. */
  tags?: readonly ('vegetarian' | 'vegan' | 'jain' | 'gluten-free' | 'contains-nuts' | 'spicy' | 'chef-pick')[];
  /** Optional image. */
  imageUrl?: string;
}

export interface RestaurantHours {
  day: string;
  time: string;
  /** Whether the restaurant is closed this day. */
  closed?: boolean;
}

export interface RestaurantContact {
  addressLines: readonly string[];
  cityLine: string;
  phone: string;
  email: string;
  hours: readonly RestaurantHours[];
  reservationNote: string;
  mapEmbedUrl: string;
}

export interface GalleryShot {
  id: string;
  src: string;
  alt: string;
}

// ── Menu — Awadhi / Mughlai ──────────────────────────────────────────────────

export const MENU_CATEGORIES: readonly MenuCategory[] = [
  { id: 'cat-kebabs',   label: 'Kebabs',     blurb: 'Smoked, slow-cooked, melt-in-mouth.' },
  { id: 'cat-mains',    label: 'Mains',      blurb: 'Awadhi gravies, finished in the dum.' },
  { id: 'cat-biryani',  label: 'Biryani',    blurb: 'Sealed-pot Lucknowi-style dum.' },
  { id: 'cat-breads',   label: 'Breads',     blurb: 'Clay-oven, saffron-glazed, baked-to-order.' },
  { id: 'cat-desserts', label: 'Desserts',   blurb: 'Old recipes, freshly-set.' },
  { id: 'cat-drinks',   label: 'Drinks',     blurb: 'Chai, mocktails, seasonal coolers.' },
];

export const MENU_ITEMS: readonly MenuItem[] = [
  // Kebabs
  { id: 'm-galouti',  categoryId: 'cat-kebabs', name: 'Galouti Kebab',          description: 'Lamb mince hand-pounded with 36 spices. Served on warqi paratha.',                priceInr: 485, tags: ['chef-pick', 'contains-nuts'] },
  { id: 'm-tunday',   categoryId: 'cat-kebabs', name: 'Tunday Kebab',           description: 'Charcoal-grilled, Lucknowi spice blend. The original 1905 recipe.',              priceInr: 520, tags: ['chef-pick'] },
  { id: 'm-reshmi',   categoryId: 'cat-kebabs', name: 'Murgh Reshmi Tikka',     description: 'Saffron-yogurt marinated chicken, blue-flame finished.',                          priceInr: 495 },
  { id: 'm-paneer',   categoryId: 'cat-kebabs', name: 'Paneer Mughlai Tikka',   description: 'House cottage cheese, slow-cooked in cashew-cream marinade.',                     priceInr: 445, tags: ['vegetarian', 'contains-nuts'] },

  // Mains
  { id: 'm-korma',    categoryId: 'cat-mains',  name: 'Awadhi Murgh Korma',     description: 'Almond + cream gravy, finished with kewda water.',                                priceInr: 595, tags: ['contains-nuts'] },
  { id: 'm-nihari',   categoryId: 'cat-mains',  name: 'Nihari Gosht',           description: 'Lamb shank, overnight slow-cooked in clay pot. Bone-marrow rich.',                priceInr: 745, tags: ['chef-pick'] },
  { id: 'm-subz',     categoryId: 'cat-mains',  name: 'Subz Miloni',            description: 'Seven-vegetable medley in fresh cream + cardamom gravy.',                         priceInr: 525, tags: ['vegetarian'] },
  { id: 'm-dal',      categoryId: 'cat-mains',  name: 'Dal Bukhara',            description: 'Black urad lentils, simmered eight hours over coal.',                              priceInr: 395, tags: ['vegetarian', 'chef-pick'] },

  // Biryani
  { id: 'm-bry-mut',  categoryId: 'cat-biryani', name: 'Mutton Dum Biryani',    description: 'Pot-sealed with dough. Aged basmati, kewda water, fried onion crisp.',             priceInr: 695, tags: ['chef-pick'] },
  { id: 'm-bry-chk',  categoryId: 'cat-biryani', name: 'Chicken Dum Biryani',   description: 'Same Lucknowi technique with chicken thigh + bone.',                                priceInr: 595 },
  { id: 'm-bry-veg',  categoryId: 'cat-biryani', name: 'Subz Dum Biryani',      description: 'Seasonal vegetables layered with saffron rice.',                                    priceInr: 525, tags: ['vegetarian'] },

  // Breads
  { id: 'm-sheermal', categoryId: 'cat-breads',  name: 'Sheermal',              description: 'Saffron-glazed flatbread, slow-baked in clay oven.',                                priceInr: 95,  tags: ['vegetarian'] },
  { id: 'm-khamiri',  categoryId: 'cat-breads',  name: 'Khamiri Roti',          description: 'Clay-oven sourdough, perfect for kebab sopping.',                                   priceInr: 65,  tags: ['vegetarian'] },
  { id: 'm-warqi',    categoryId: 'cat-breads',  name: 'Warqi Paratha',         description: '64-layer ghee paratha, hand-folded.',                                                priceInr: 125, tags: ['vegetarian'] },

  // Desserts
  { id: 'm-shahi',    categoryId: 'cat-desserts', name: 'Shahi Tukda',          description: 'Saffron-soaked bread, rabri + chopped pistachios.',                                 priceInr: 325, tags: ['vegetarian', 'contains-nuts', 'chef-pick'] },
  { id: 'm-phirni',   categoryId: 'cat-desserts', name: 'Phirni',               description: 'Clay-pot rice pudding with rose-water + saffron.',                                  priceInr: 295, tags: ['vegetarian', 'gluten-free'] },

  // Drinks
  { id: 'm-chai',     categoryId: 'cat-drinks',   name: 'Masala Chai',          description: 'Ginger, cardamom, fennel. Brewed slow, served scalding.',                          priceInr: 65,  tags: ['vegetarian'] },
  { id: 'm-aam',      categoryId: 'cat-drinks',   name: 'Aam Panna Mocktail',   description: 'Green mango cooler with mint + Himalayan rock salt.',                               priceInr: 185, tags: ['vegetarian', 'vegan'] },
  { id: 'm-thandai',  categoryId: 'cat-drinks',   name: 'Royal Thandai',        description: 'Almond, cashew, fennel, pepper. Seasonal — March to June.',                         priceInr: 245, tags: ['vegetarian', 'contains-nuts'] },
];

// ── Gallery ─────────────────────────────────────────────────────────────────
// Unsplash food photography — licensed for marketplace preview.
export const RESTAURANT_GALLERY: readonly GalleryShot[] = [
  { id: 'g-1', src: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80', alt: 'Biryani close-up' },
  { id: 'g-2', src: 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800&q=80', alt: 'Tikka platter'    },
  { id: 'g-3', src: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80', alt: 'Curry close'       },
  { id: 'g-4', src: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80', alt: 'Naan basket'       },
  { id: 'g-5', src: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80', alt: 'Bread platter'     },
  { id: 'g-6', src: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80', alt: 'Indian thali'      },
  { id: 'g-7', src: 'https://images.unsplash.com/photo-1626777553635-99d6ba00fbc4?w=800&q=80', alt: 'Chai service'      },
  { id: 'g-8', src: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80', alt: 'Dining room shot' },
];

// ── Contact ─────────────────────────────────────────────────────────────────
export const RESTAURANT_CONTACT: RestaurantContact = {
  addressLines: [
    'Rasoi by Anand',
    'Ground Floor, Pataa Plaza',
    'Linking Road, Bandra West',
  ],
  cityLine: 'Mumbai 400050, Maharashtra',
  phone: '+91 9702 60 1111',
  email: 'reservations@example.com',
  hours: [
    { day: 'Monday',           time: 'Closed', closed: true                  },
    { day: 'Tuesday – Friday', time: '7:00 pm – 11:00 pm'                    },
    { day: 'Saturday',         time: '12:30 pm – 3:00 pm,  7:00 pm – 11:30 pm' },
    { day: 'Sunday',           time: '12:30 pm – 3:00 pm,  7:00 pm – 10:30 pm' },
  ],
  reservationNote: 'Tables for 4 or more on Saturdays — please reserve 48 hours ahead.',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.236!2d72.8295!3d19.0594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzMzLjkiTiA3MsKwNDknNDYuMiJF!5e0!3m2!1sen!2sin!4v1717180000000',
};

// ── Hero photo URL — used by HeroPhoto background ───────────────────────────
export const RESTAURANT_HERO_PHOTO =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2400&q=85';

// ── Tag styling — shared across menu variants ───────────────────────────────
export const TAG_LABEL: Record<NonNullable<MenuItem['tags']>[number], string> = {
  vegetarian:     'Veg',
  vegan:          'Vegan',
  jain:           'Jain',
  'gluten-free':  'GF',
  'contains-nuts': 'Nuts',
  spicy:          'Spicy',
  'chef-pick':    "Chef's pick",
};
