import React, { type ReactNode } from 'react';
import { ContentProvider } from '@/providers/ContentProvider';
import { StampPassProvider } from '@/providers/StampPassProvider';
import { FavoritesProvider } from '@/providers/FavoritesProvider';
import { ReviewProvider } from '@/providers/ReviewProvider';
import { markTime } from '@/lib/perf';

export function EssentialProviders({ children }: { children: ReactNode }) {
  markTime('EssentialProviders_mount');
  console.log('[BOOT] Tier 1 – Essential providers mounting (Home-critical only)');
  return (
    <ContentProvider>
      <StampPassProvider>
        <FavoritesProvider>
          <ReviewProvider>
            {children}
          </ReviewProvider>
        </FavoritesProvider>
      </StampPassProvider>
    </ContentProvider>
  );
}
