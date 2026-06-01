'use client';

// Variant dispatcher. Reads `heroVariant` from the centralized BuildContext
// and renders the matching pre-built layout. Adding a variant is two lines:
// a new file under this folder + a new `case`.

import { useBuild } from '@/contexts/BuildContext';
import { HeroSplit } from './HeroSplit';
import { HeroCentered } from './HeroCentered';

export function HeroSection() {
  const { currentConfig } = useBuild();
  switch (currentConfig.heroVariant) {
    case 'centered': return <HeroCentered />;
    case 'split':
    default:         return <HeroSplit />;
  }
}
