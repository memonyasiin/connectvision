'use client';

import { useBuild } from '@/contexts/BuildContext';
import { RESTAURANT_CONTACT } from './_sampleContent';

const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'minimal';

export function FooterMinimal() {
  const { currentConfig } = useBuild();
  const { businessName, tagline } = currentConfig;
  const year = new Date().getFullYear();
  const contact = RESTAURANT_CONTACT;
  const todayHours = contact.hours.find((h) => !h.closed)?.time ?? 'See hours';

  return (
    <footer
      data-theme={THEME_ID}
      data-section-kind="footer"
      data-variant={VARIANT_ID}
      className="border-t border-amber-200/40 px-5 md:px-10 py-12"
      style={{ background: '#fefcf7' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h3
            className="text-3xl md:text-4xl font-light text-stone-900 tracking-tight"
            style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
          >
            {businessName}
          </h3>
          {tagline ? (
            <p
              className="mt-1 text-sm italic text-stone-500"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {tagline}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-3 text-center md:text-left text-sm text-stone-600 max-w-4xl mx-auto pt-8 border-t border-amber-200/40">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1">Visit</div>
            <div>{contact.addressLines[0]}</div>
            <div>{contact.cityLine}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1">Hours</div>
            <div>{todayHours}</div>
            <div className="text-xs text-stone-400 italic">Closed Mondays</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1">Reach</div>
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="block hover:underline tabular-nums"
              style={{ color: 'var(--primary-color)' }}
            >
              {contact.phone}
            </a>
            <a
              href={`https://wa.me/${contact.phone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs hover:underline"
              style={{ color: 'var(--primary-color)' }}
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-amber-200/40 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div>© {year} {businessName}</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-stone-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-stone-600 transition-colors">Cancellation policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
