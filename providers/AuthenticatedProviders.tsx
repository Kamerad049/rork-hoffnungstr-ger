import React, { type ReactNode } from 'react';
import { FriendsProvider } from '@/providers/FriendsProvider';
import { SocialProvider } from '@/providers/SocialProvider';
import { PostsProvider } from '@/providers/PostsProvider';
import { ChatProvider } from '@/providers/ChatProvider';
import { StoriesProvider } from '@/providers/StoriesProvider';
import { ReelsProvider } from '@/providers/ReelsProvider';
import { FavoritesProvider } from '@/providers/FavoritesProvider';
import { StampPassProvider } from '@/providers/StampPassProvider';
import { ReviewProvider } from '@/providers/ReviewProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { ModerationProvider } from '@/providers/ModerationProvider';
import { AdminProvider } from '@/providers/AdminProvider';
import { KaderschmiedeProvider } from '@/providers/KaderschmiedeProvider';
import { LiveLocationProvider } from '@/providers/LiveLocationProvider';
import { SpotifyProvider } from '@/providers/SpotifyProvider';
import { OrdenProvider } from '@/providers/OrdenProvider';
import { useAuth } from '@/providers/AuthProvider';
import { markTime } from '@/lib/perf';

function AuthenticatedStack({ children }: { children: ReactNode }) {
  markTime('AuthenticatedProviders_mount');
  return (
    <FriendsProvider>
      <SocialProvider>
        <PostsProvider>
          <ChatProvider>
            <StoriesProvider>
              <ReelsProvider>
                <FavoritesProvider>
                  <StampPassProvider>
                    <ReviewProvider>
                      <NotificationProvider>
                        <ModerationProvider>
                          <AdminProvider>
                            <KaderschmiedeProvider>
                              <LiveLocationProvider>
                                <SpotifyProvider>
                                  <OrdenProvider>
                                    {children}
                                  </OrdenProvider>
                                </SpotifyProvider>
                              </LiveLocationProvider>
                            </KaderschmiedeProvider>
                          </AdminProvider>
                        </ModerationProvider>
                      </NotificationProvider>
                    </ReviewProvider>
                  </StampPassProvider>
                </FavoritesProvider>
              </ReelsProvider>
            </StoriesProvider>
          </ChatProvider>
        </PostsProvider>
      </SocialProvider>
    </FriendsProvider>
  );
}

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading || !isLoggedIn) {
    return <>{children}</>;
  }

  return <AuthenticatedStack>{children}</AuthenticatedStack>;
}
