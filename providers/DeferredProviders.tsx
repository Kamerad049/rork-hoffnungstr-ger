import React, { useState, useEffect, type ReactNode } from 'react';
import { InteractionManager } from 'react-native';
import { FriendsProvider } from '@/providers/FriendsProvider';
import { SocialProvider } from '@/providers/SocialProvider';
import { PostsProvider } from '@/providers/PostsProvider';
import { ChatProvider } from '@/providers/ChatProvider';
import { StoriesProvider } from '@/providers/StoriesProvider';
import { ReelsProvider } from '@/providers/ReelsProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { LiveLocationProvider } from '@/providers/LiveLocationProvider';
import { SpotifyProvider } from '@/providers/SpotifyProvider';
import { OrdenProvider } from '@/providers/OrdenProvider';
import { markTime } from '@/lib/perf';

function DeferredStack({ children }: { children: ReactNode }) {
  markTime('DeferredProviders_mount');
  console.log('[BOOT] Tier 2 – Deferred providers now mounting');
  return (
    <FriendsProvider>
      <SocialProvider>
        <PostsProvider>
          <ChatProvider>
            <StoriesProvider>
              <ReelsProvider>
                <NotificationProvider>
                  <LiveLocationProvider>
                    <SpotifyProvider>
                      <OrdenProvider>
                        {children}
                      </OrdenProvider>
                    </SpotifyProvider>
                  </LiveLocationProvider>
                </NotificationProvider>
              </ReelsProvider>
            </StoriesProvider>
          </ChatProvider>
        </PostsProvider>
      </SocialProvider>
    </FriendsProvider>
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
