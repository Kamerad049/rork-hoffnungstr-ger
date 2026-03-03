import { useState, useEffect, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { markTime, trackNetwork, trackRender } from '@/lib/perf';
import type { Gender, Religion } from '@/constants/types';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

const PROFILE_FETCH_TIMEOUT = 8000;
const STAY_LOGGED_IN_KEY = 'auth_stay_logged_in';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.log(`[AUTH] ${label} timed out after ${ms}ms`);
      reject(new Error(`${label} timeout`));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  trackRender('AuthProvider');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(true);
  const initDone = useRef<boolean>(false);
  const retryCount = useRef<number>(0);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STAY_LOGGED_IN_KEY).then((val) => {
      if (val !== null) {
        setStayLoggedIn(val === 'true');
      }
    }).catch(() => {});
  }, []);

  const fetchProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<AuthUser | null> => {
    try {
      console.log('[AUTH] Fetching profile for:', supabaseUser.id);
      const { data, error } = await trackNetwork('auth.fetchProfile', () =>
        withTimeout(
          Promise.resolve(
            supabase
              .from('users')
              .select('id, display_name, email, is_admin')
              .eq('id', supabaseUser.id)
              .single()
          ),
          PROFILE_FETCH_TIMEOUT,
          'fetchProfile',
        )
      );

      if (error || !data) {
        console.log('[AUTH] No profile found for user:', supabaseUser.id, error?.message);
        return null;
      }

      console.log('[AUTH] Profile loaded:', data.display_name);
      return {
        id: data.id,
        name: data.display_name,
        email: data.email,
        isAdmin: data.is_admin ?? false,
      };
    } catch (e: any) {
      console.log('[AUTH] Failed to fetch profile:', e?.message ?? e);
      return null;
    }
  }, []);

  const forceLogout = useCallback(async () => {
    console.log('[AUTH] Force logout - clearing state');
    setUser(null);
    userRef.current = null;
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('[AUTH] Force signOut error (ignored):', e);
    }
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const initAuth = async () => {
      try {
        console.log('[AUTH] Initializing auth...');
        markTime('auth_getSession_start');
        const result = await trackNetwork('auth.getSession', () =>
          withTimeout(
            supabase.auth.getSession(),
            10000,
            'getSession',
          )
        ) as { data: { session: Session | null } };
        markTime('auth_getSession_done');
        const currentSession = result.data.session;
        console.log('[AUTH] Initial session:', currentSession ? 'found' : 'none');

        if (!currentSession?.user) {
          console.log('[AUTH] No session, user needs to login');
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);

        const profile = await fetchProfile(currentSession.user);
        if (profile) {
          setUser(profile);
          userRef.current = profile;
          retryCount.current = 0;
        } else {
          console.log('[AUTH] Profile fetch failed on init, retrying once...');
          await new Promise((r) => setTimeout(r, 1500));
          const retryProfile = await fetchProfile(currentSession.user);
          if (retryProfile) {
            setUser(retryProfile);
            userRef.current = retryProfile;
            retryCount.current = 0;
          } else {
            console.log('[AUTH] Profile fetch failed after retry - session exists but no profile');
            setUser(null);
            userRef.current = null;
          }
        }
      } catch (e: any) {
        console.log('[AUTH] Init auth error:', e?.message ?? e);
        setSession(null);
        setUser(null);
      } finally {
        markTime('auth_init_complete');
        setIsLoading(false);
      }
    };

    initAuth();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const result = supabase.auth.onAuthStateChange(async (event: any, newSession: any) => {
        console.log('[AUTH] Auth state changed:', event, 'session:', !!newSession);

        if (event === 'SIGNED_OUT') {
          console.log('[AUTH] User signed out');
          setUser(null);
          setSession(null);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('[AUTH] Token refreshed successfully');
          setSession(newSession);
          if (userRef.current) {
            console.log('[AUTH] Token refreshed, user already set — skipping profile fetch');
          }
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          if (!userRef.current) {
            console.log('[AUTH] No user in ref, fetching profile after auth state change');
            const profile = await fetchProfile(newSession.user);
            if (profile) {
              setUser(profile);
              userRef.current = profile;
            }
          }
        } else if (!newSession) {
          console.log('[AUTH] Session lost (null session in state change)');
          setUser(null);
          userRef.current = null;
          setSession(null);
        }
      });
      subscription = result?.data?.subscription ?? null;
    } catch (e: any) {
      console.log('[AUTH] onAuthStateChange setup error:', e?.message ?? e);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const updateStayLoggedIn = useCallback(async (value: boolean) => {
    setStayLoggedIn(value);
    await AsyncStorage.setItem(STAY_LOGGED_IN_KEY, String(value));
    console.log('[AUTH] Stay logged in set to:', value);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[AUTH] Logging in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[AUTH] Login error:', error.message);
      throw new Error(error.message);
    }

    if (data.session) {
      setSession(data.session);
    }

    if (data.user) {
      const profile = await fetchProfile(data.user);
      if (profile) {
        setUser(profile);
        userRef.current = profile;
        retryCount.current = 0;
        return profile;
      }
      throw new Error('Profil nicht gefunden. Bitte kontaktiere den Support.');
    }

    throw new Error('Anmeldung fehlgeschlagen.');
  }, [fetchProfile]);

  const register = useCallback(async (name: string, email: string, password: string, extras?: { gender?: Gender; religion?: Religion }) => {
    console.log('[AUTH] Registering with email:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log('[AUTH] Register error:', error.message);
      throw new Error(error.message);
    }

    if (data.user) {
      const username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36);

      const profileData: Record<string, unknown> = {
        id: data.user.id,
        username,
        display_name: name,
        email,
      };
      if (extras?.gender) profileData.gender = extras.gender;
      if (extras?.religion) profileData.religion = extras.religion;

      const { error: profileError } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.log('[AUTH] Profile creation error:', profileError.message);
        throw new Error('Profil konnte nicht erstellt werden: ' + profileError.message);
      }

      if (data.session) {
        setSession(data.session);
      }

      const authUser: AuthUser = {
        id: data.user.id,
        name,
        email,
        isAdmin: false,
      };
      setUser(authUser);
      userRef.current = authUser;
      return authUser;
    }

    throw new Error('Registrierung fehlgeschlagen.');
  }, []);

  const resetPassword = useCallback(async (resetEmail: string) => {
    console.log('[AUTH] Sending password reset email to:', resetEmail);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (error) {
      console.log('[AUTH] Reset password error:', error.message);
      throw new Error(error.message);
    }
    console.log('[AUTH] Password reset email sent successfully');
  }, []);

  const logout = useCallback(async () => {
    console.log('[AUTH] Logging out');
    setUser(null);
    userRef.current = null;
    setSession(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[AUTH] Logout error:', error.message);
      }
    } catch (e) {
      console.log('[AUTH] Logout exception:', e);
    }
  }, []);

  const isLoggedIn = !!user && !!session;

  return {
    user,
    session,
    isLoading,
    isLoggedIn,
    stayLoggedIn,
    updateStayLoggedIn,
    login,
    register,
    logout,
    forceLogout,
    resetPassword,
  };
});
