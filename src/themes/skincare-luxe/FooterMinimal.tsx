'use client';

import { useBuild } from '@/contexts/BuildContext';
import { SKINCARE_SOCIAL } from './_sampleContent';

const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'minimal';

export function FooterMinimal() {
  const { currentConfig } = useBuild();
  const { businessName } = currentConfig;
  const year = new Date().getFullYear();

  return (
    <footer
      data-theme={THEME_ID}
      data-section-kind="footer"
      data-variant={VARIANT_ID}
      className="border-t border-[#e8e1c9] py-10 px-5 md:px-10"
      style={{ background: '#fbfaf7' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
        <div className="text-[#94918a]">
          © {year} {businessName}. All rights reserved.
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {SKINCARE_SOCIAL.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4a5560] hover:text-[color:var(--primary-color)] transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#services"
                className="text-[#4a5560] hover:text-[color:var(--primary-color)] transition-colors"
              >
                Services
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="text-[#4a5560] hover:text-[color:var(--primary-color)] transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.
