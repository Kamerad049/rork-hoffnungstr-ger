import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
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
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { markTime, measureSinceBoot, trackRender, printReport } from '@/lib/perf';

markTime('module_load');

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.log('[App] SplashScreen.preventAutoHideAsync error:', e);
}

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('[App] Notifications setup error:', e);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  trackRender('RootLayoutNav');
  const { isLoggedIn, isLoading, user, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const firstUIRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      hasRedirected.current = false;
      return;
    }

    const firstSegment = segments[0] as string;
    const inAuthGroup = firstSegment === 'login' || firstSegment === 'register';

    console.log('[NAV] Auth check - isLoggedIn:', isLoggedIn, 'user:', !!user, 'session:', !!session, 'segment:', firstSegment);

    if (!isLoggedIn && !inAuthGroup) {
      console.log('[NAV] Not logged in, redirecting to login');
      hasRedirected.current = true;
      router.replace('/login' as any);
    } else if (isLoggedIn && inAuthGroup && !hasRedirected.current) {
      console.log('[NAV] Logged in but on auth page, redirecting to home');
      router.replace('/' as any);
    }
  }, [isLoggedIn, isLoading, segments, user, session]);

  if (!firstUIRef.current) {
    firstUIRef.current = true;
    measureSinceBoot('RootLayoutNav_first_render');
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="login"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="user-profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="direct-chat"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user-posts"
          options={{
            headerShown: true,
            title: 'Beiträge',
            headerBackTitle: 'Zurück',
          }}
        />
        <Stack.Screen
          name="user-friends"
          options={{
            headerShown: true,
            title: 'Freunde',
            headerBackTitle: 'Zurück',
          }}
        />
        <Stack.Screen
          name="user-stamps"
          options={{
            headerShown: true,
            title: 'Stempel',
            headerBackTitle: 'Zurück',
          }}
        />
        <Stack.Screen
          name="user-reel-feed"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="story-viewer"
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  trackRender('RootLayout');
  useEffect(() => {
    markTime('RootLayout_mounted');
    console.log('[BOOT] Step D: ALL providers enabled');
    SplashScreen.hideAsync();
    setTimeout(() => printReport(), 5000);
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
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
                                            <RootLayoutNav />
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
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
