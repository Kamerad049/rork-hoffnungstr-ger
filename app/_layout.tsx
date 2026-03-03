import { useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AlertProvider } from '@/providers/AlertProvider';
import AlertRoot from '@/components/AlertRoot';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { DeferredProviders } from '@/providers/DeferredProviders';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { markTime, measureSinceBoot, trackRender, printReport } from '@/lib/perf';

markTime('module_load');

if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  const originalError = console.error;
  const responderFilter = /Unknown event handler property/;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && responderFilter.test(args[0])) return;
    originalWarn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && responderFilter.test(args[0])) return;
    originalError.apply(console, args);
  };
}

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
      <OfflineBanner />
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
        <Stack.Screen
          name="submit-suggestion"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="location-posts"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading || !isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <DeferredProviders>
      {children}
    </DeferredProviders>
  );
}

export default function RootLayout() {
  trackRender('RootLayout');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    markTime('RootLayout_mounted');
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
    setTimeout(() => printReport(), 5000);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AlertProvider>
              <AuthProvider>
                <AuthGate>
                  <RootLayoutNav />
                  <AlertRoot />
                </AuthGate>
              </AuthProvider>
            </AlertProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
