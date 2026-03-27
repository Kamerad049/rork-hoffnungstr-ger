import React, { useState, useEffect, type ReactNode } from 'react';
import { InteractionManager } from 'react-native';
import { FriendsProvider } from '@/providers/FriendsProvider';
import { SocialProvider } from '@/providers/SocialProvider';
import { PostsProvider } from '@/providers/PostsProvider';
import { ChatProvider } from '@/providers/ChatProvider';
import { StoriesProvider } from '@/providers/StoriesProvider';
import { ReelsProvider } from '@/providers/ReelsProvider';
import { LiveLocationProvider } from '@/providers/LiveLocationProvider';
import { SpotifyProvider } from '@/providers/SpotifyProvider';
import { ModerationProvider } from '@/providers/ModerationProvider';
import { PromotionProvider } from '@/providers/PromotionProvider';
import { composeProviders } from '@/providers/composeProviders';
import { markTime } from '@/lib/perf';

function DeferredStack({ children }: { children: ReactNode }) {
  markTime('DeferredProviders_mount');
  console.log('[BOOT] Tier 2 – Deferred providers now mounting (8 flat, down from 10 nested)');
  return composeProviders(
    [
      FriendsProvider,
      SocialProvider,
      PostsProvider,
      ChatProvider,
      StoriesProvider,
      ReelsProvider,
      LiveLocationProvider,
      SpotifyProvider,
      ModerationProvider,
      PromotionProvider,
    ],
    children,
  );
}

export function DeferredProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      console.log('[BOOT] InteractionManager done – mounting deferred providers');
      setReady(true);
      markTime('DeferredProviders_ready');
    });
    return () => task.cancel();
  }, []);

  if (!ready) {
    return <>{children}</>;
  }

  return <DeferredStack>{children}</DeferredStack>;
}
