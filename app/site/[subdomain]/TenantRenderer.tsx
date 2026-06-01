'use client';

// Thin client component that mounts the registry-driven hero. Lives in a
// dedicated file because section components are client components (they
// use the BuildContext hook), and we want the page.tsx itself to stay a
// pure server component for the metadata + DB fetch path.

import { SectionRenderer } from '@/sections/_dispatcher';

export function TenantRenderer() {
  return (
    <main>
      <SectionRenderer kind="hero" />
    </main>
  );
}
