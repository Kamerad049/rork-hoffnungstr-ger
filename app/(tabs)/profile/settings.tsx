import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  UserPen,
  Users,
  MessageCircle,
  Bookmark,
  Shield,
  LogOut,
} from 'lucide-react-native';
import { useFriends } from '@/providers/FriendsProvider';
import { useChat } from '@/providers/ChatProvider';
import { useReels } from '@/providers/ReelsProvider';

import { useAuth } from '@/providers/AuthProvider';

import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { friendRequestUsers } = useFriends();
  const { conversations } = useChat();
  const { savedReels } = useReels();

  const { user, logout } = useAuth();

  const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleNavigate = useCallback((path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as any);
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416']}
        style={[styles.heroSection, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ChevronLeft size={20} color="#BFA35D" />
        </Pressable>
        <View style={styles.heroPattern}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.heroLine,
                {
                  top: 20 + i * 28,
                  opacity: 0.03 + i * 0.005,
                  transform: [{ rotate: '-12deg' }],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.heroTitle}>Einstellungen</Text>
      </LinearGradient>

      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Profil</Text>

        <Pressable
          style={styles.menuItem}
          onPress={() => handleNavigate('/(tabs)/profile/edit')}
          testID="settings-edit-profile"
        >
          <UserPen size={20} color="#BFA35D" />
          <Text style={styles.menuItemText}>Profil bearbeiten</Text>
          <ChevronRight size={18} color="rgba(232,220,200,0.25)" />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => handleNavigate('/(tabs)/profile/privacy')}
          testID="settings-privacy"
        >
          <Shield size={20} color="#BFA35D" />
          <Text style={styles.menuItemText}>Privatsphäre</Text>
          <ChevronRight size={18} color="rgba(232,220,200,0.25)" />
        </Pressable>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Social & Verwaltung</Text>

        <Pressable
          style={styles.menuItem}
          onPress={() => handleNavigate('/(tabs)/profile/friends')}
          testID="settings-friends"
        >
          <Users size={20} color="#BFA35D" />
          <Text style={styles.menuItemText}>Freunde</Text>
          <View style={styles.menuItemRight}>
            {friendRequestUsers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{friendRequestUsers.length}</Text>
              </View>
            )}
            <ChevronRight size={18} color="rgba(232,220,200,0.25)" />
          </View>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => handleNavigate('/(tabs)/profile/messages')}
          testID="settings-messages"
        >
          <MessageCircle size={20} color="#BFA35D" />
          <Text style={styles.menuItemText}>Nachrichten</Text>
          <View style={styles.menuItemRight}>
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages}</Text>
              </View>
            )}
            <ChevronRight size={18} color="rgba(232,220,200,0.25)" />
          </View>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => handleNavigate('/(tabs)/profile/saved')}
          testID="settings-saved"
        >
          <Bookmark size={20} color="#BFA35D" />
          <Text style={styles.menuItemText}>Gespeicherte Beiträge</Text>
          <View style={styles.menuItemRight}>
            {savedReels.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{savedReels.length}</Text>
              </View>
            )}
            <ChevronRight size={18} color="rgba(232,220,200,0.25)" />
          </View>
        </Pressable>
      </View>

      {user?.isAdmin && (
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Administration</Text>
          <Pressable
            style={styles.adminCard}
            onPress={() => handleNavigate('/admin')}
            testID="settings-admin-panel"
          >
            <View style={styles.adminIconWrap}>
              <Shield size={20} color="#1c1c1e" />
            </View>
            <View style={styles.adminTextWrap}>
              <Text style={styles.adminTitle}>Admin Panel</Text>
              <Text style={styles.adminSub}>Inhalte & Push verwalten</Text>
            </View>
            <ChevronRight size={18} color="#1c1c1e" />
          </Pressable>
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Konto</Text>
        <Pressable
          style={styles.logoutBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/login?direct=1' as any);
            setTimeout(() => { logout(); }, 100);
          }}
          testID="settings-logout-btn"
        >
          <LogOut size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Abmelden</Text>
        </Pressable>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'flex-start' as const,
    marginBottom: 20,
    zIndex: 10,
  },
  heroTitle: {
    color: '#E8DCC8',
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#1e1e20',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#BFA35D',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },

  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
  },
  adminIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(28,28,30,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTextWrap: {
    flex: 1,
  },
  adminTitle: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  adminSub: {
    color: 'rgba(28,28,30,0.6)',
    fontSize: 12,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.15)',
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E74C3C',
  },
});
