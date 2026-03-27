import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Shield, FileText, Users, Award, Rss, Camera, MapPin, Home, Map, Sparkles, ShieldOff, Ban, UserX, Clock, ChevronLeft, AtSign, Music, Eye, EyeOff, UserCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { getUserById } from '@/lib/utils';
import { useSocial, type PrivacyLevel } from '@/providers/SocialProvider';
import { useFriends } from '@/providers/FriendsProvider';
import { useSpotify, type MusicVisibility } from '@/providers/SpotifyProvider';
import type { SocialUser } from '@/constants/types';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/providers/AlertProvider';

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; description: string }[] = [
  { value: 'everyone', label: 'Alle', description: 'Jeder kann es sehen' },
  { value: 'friends', label: 'Nur Freunde', description: 'Nur deine Freunde' },
  { value: 'private', label: 'Privat', description: 'Nur du selbst' },
];

interface PrivacyRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  currentValue: PrivacyLevel;
  onSelect: (value: PrivacyLevel) => void;
}

function PrivacyRow({
  icon,
  title,
  subtitle,
  currentValue,
  onSelect,
}: PrivacyRowProps) {
  return (
    <View style={styles.settingBlock}>
      <View style={styles.settingHeader}>
        {icon}
        <View style={styles.settingHeaderText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.optionsRow}>
        {PRIVACY_OPTIONS.map((opt) => {
          const isActive = currentValue === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.optionPill,
                isActive ? styles.optionPillActive : styles.optionPillInactive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(opt.value);
              }}
              testID={`privacy-${title}-${opt.value}`}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? '#1c1c1e' : 'rgba(232,220,200,0.5)' },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const MUSIC_VISIBILITY_OPTIONS: { value: MusicVisibility; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { value: 'everyone', label: 'Alle', icon: Eye },
  { value: 'friends', label: 'Freunde', icon: UserCheck },
  { value: 'nobody', label: 'Niemand', icon: EyeOff },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { privacy, updatePrivacy } = useSocial();
  const { blockedUsers, blockedAt, unblockUser } = useFriends();
  const { settings: spotifySettings, toggleEnabled: toggleSpotify, setVisibility: setMusicVisibility } = useSpotify();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const getDaysBlocked = useCallback((userId: string): number => {
    const dateStr = blockedAt[userId];
    if (!dateStr) return 0;
    const blockedDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - blockedDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [blockedAt]);

  const blockedUserProfiles = useMemo((): SocialUser[] => {
    return blockedUsers
      .map((id) => getUserById(id))
      .filter((u): u is SocialUser => !!u);
  }, [blockedUsers]);

  const handleUnblock = useCallback((user: SocialUser) => {
    showAlert(
      'Sperre aufheben',
      `Möchtest du ${user.displayName} wirklich entsperren? Die Person kann dir dann wieder folgen und Nachrichten senden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entsperren',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            unblockUser(user.id);
            console.log('[PRIVACY] Unblocked user:', user.id);
          },
        },
      ],
    );
  }, [unblockUser]);

  const handleUpdate = useCallback(
    (key: keyof typeof privacy, value: PrivacyLevel) => {
      updatePrivacy({ [key]: value });
    },
    [updatePrivacy],
  );

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

        <View style={styles.heroIconWrap}>
          <Shield size={32} color="#BFA35D" />
        </View>
        <Text style={styles.heroTitle}>Privatsphäre</Text>
        <Text style={styles.heroSubtitle}>
          Steuere, wer deine Inhalte und Informationen sehen kann.
        </Text>
      </LinearGradient>

      <View style={styles.contentSection}>
        <Text style={styles.sectionLabel}>Profil-Sichtbarkeit</Text>

        <PrivacyRow
          icon={<FileText size={20} color="#BFA35D" />}
          title="Beiträge"
          subtitle="Wer kann deine Beiträge auf deinem Profil sehen?"
          currentValue={privacy.showPosts}
          onSelect={(v) => handleUpdate('showPosts', v)}
        />

        <PrivacyRow
          icon={<Users size={20} color="#BFA35D" />}
          title="Freundesliste"
          subtitle="Wer kann deine Freunde sehen?"
          currentValue={privacy.showFriends}
          onSelect={(v) => handleUpdate('showFriends', v)}
        />

        <PrivacyRow
          icon={<Award size={20} color="#BFA35D" />}
          title="Stempelkarte"
          subtitle="Wer kann deine gesammelten Stempel sehen?"
          currentValue={privacy.showStamps}
          onSelect={(v) => handleUpdate('showStamps', v)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Persönliche Daten</Text>

        <PrivacyRow
          icon={<MapPin size={20} color="#BFA35D" />}
          title="Geburtsort"
          subtitle="Wer kann deinen Geburtsort sehen?"
          currentValue={privacy.showBirthplace}
          onSelect={(v) => handleUpdate('showBirthplace', v)}
        />

        <PrivacyRow
          icon={<Home size={20} color="#BFA35D" />}
          title="Wohnort"
          subtitle="Wer kann deinen Wohnort sehen?"
          currentValue={privacy.showResidence}
          onSelect={(v) => handleUpdate('showResidence', v)}
        />

        <PrivacyRow
          icon={<Map size={20} color="#BFA35D" />}
          title="Bundesland"
          subtitle="Wer kann dein Bundesland sehen?"
          currentValue={privacy.showBundesland}
          onSelect={(v) => handleUpdate('showBundesland', v)}
        />

        <PrivacyRow
          icon={<Sparkles size={20} color="#BFA35D" />}
          title="Persönliche Werte"
          subtitle="Wer kann deine Werte sehen?"
          currentValue={privacy.showValues}
          onSelect={(v) => handleUpdate('showValues', v)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Feed & Stories</Text>

        <PrivacyRow
          icon={<Rss size={20} color="#BFA35D" />}
          title="Feed-Beiträge"
          subtitle="Wer kann deine Beiträge im Feed sehen?"
          currentValue={privacy.feedPostVisibility}
          onSelect={(v) => handleUpdate('feedPostVisibility', v)}
        />

        <PrivacyRow
          icon={<Camera size={20} color="#BFA35D" />}
          title="Stories"
          subtitle="Wer kann deine Stories sehen?"
          currentValue={privacy.storyVisibility}
          onSelect={(v) => handleUpdate('storyVisibility', v)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Markierungen</Text>

        <PrivacyRow
          icon={<AtSign size={20} color="#BFA35D" />}
          title="Markierungen erlauben"
          subtitle="Wer darf dich in Beiträgen markieren?"
          currentValue={privacy.allowTagging}
          onSelect={(v) => handleUpdate('allowTagging', v)}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Musik</Text>

        <View style={styles.settingBlock}>
          <View style={styles.settingHeader}>
            <Music size={20} color="#1DB954" />
            <View style={styles.settingHeaderText}>
              <Text style={styles.settingTitle}>Aktueller Song anzeigen</Text>
              <Text style={styles.settingSubtitle}>
                Zeige auf deinem Profil, was du gerade hörst.
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.optionPill,
              spotifySettings.enabled ? styles.spotifyToggleActive : styles.optionPillInactive,
              { alignSelf: 'flex-start', marginBottom: 12 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSpotify();
            }}
            testID="spotify-toggle"
          >
            <Text
              style={[
                styles.optionText,
                { color: spotifySettings.enabled ? '#141416' : 'rgba(232,220,200,0.5)' },
              ]}
            >
              {spotifySettings.enabled ? 'Aktiviert' : 'Deaktiviert'}
            </Text>
          </Pressable>

          {spotifySettings.enabled && (
            <>
              <Text style={styles.musicSubLabel}>Wer darf sehen, was du hörst?</Text>
              <View style={styles.optionsRow}>
                {MUSIC_VISIBILITY_OPTIONS.map((opt) => {
                  const isActive = spotifySettings.visibility === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.optionPill,
                        isActive ? styles.spotifyToggleActive : styles.optionPillInactive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMusicVisibility(opt.value);
                      }}
                      testID={`music-visibility-${opt.value}`}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: isActive ? '#141416' : 'rgba(232,220,200,0.5)' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {spotifySettings.visibility === 'nobody' && (
                <Text style={styles.musicHint}>
                  Einzelne Personen können später über deren Profil freigeschaltet werden.
                </Text>
              )}
            </>
          )}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Gesperrte Personen</Text>

        <View style={styles.settingBlock}>
          <View style={styles.settingHeader}>
            <Ban size={20} color="#C06060" />
            <View style={styles.settingHeaderText}>
              <Text style={styles.settingTitle}>Blockierte Nutzer</Text>
              <Text style={styles.settingSubtitle}>
                Blockierte Personen können dich nicht kontaktieren und sehen deine Inhalte nicht.
              </Text>
            </View>
          </View>

          {blockedUserProfiles.length === 0 ? (
            <View style={styles.emptyBlocked}>
              <ShieldOff size={32} color="rgba(232,220,200,0.3)" />
              <Text style={styles.emptyBlockedText}>
                Du hast niemanden blockiert
              </Text>
            </View>
          ) : (
            <View style={styles.blockedList}>
              {blockedUserProfiles.map((bu) => (
                <View
                  key={bu.id}
                  style={styles.blockedRow}
                >
                  <View style={styles.blockedUserInfo}>
                    {bu.avatarUrl ? (
                      <Image source={{ uri: bu.avatarUrl }} style={styles.blockedAvatar} />
                    ) : (
                      <View style={styles.blockedAvatarFallback}>
                        <UserX size={16} color="rgba(232,220,200,0.4)" />
                      </View>
                    )}
                    <View style={styles.blockedNameCol}>
                      <Text style={styles.blockedName} numberOfLines={1}>
                        {bu.displayName}
                      </Text>
                      <Text style={styles.blockedUsername} numberOfLines={1}>
                        @{bu.username}
                      </Text>
                      <View style={styles.blockedDaysRow}>
                        <Clock size={11} color="#C06060" />
                        <Text style={styles.blockedDaysText}>
                          {getDaysBlocked(bu.id) === 0
                            ? 'Heute gesperrt'
                            : `Seit ${getDaysBlocked(bu.id)} ${getDaysBlocked(bu.id) === 1 ? 'Tag' : 'Tagen'} gesperrt`}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={styles.unblockButton}
                    onPress={() => handleUnblock(bu)}
                    testID={`unblock-${bu.id}`}
                  >
                    <Text style={styles.unblockText}>Entsperren</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    zIndex: 10,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLine: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: '#BFA35D',
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  contentSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
    color: 'rgba(191,163,93,0.6)',
  },
  settingBlock: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#1e1e20',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  settingHeaderText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(232,220,200,0.4)',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optionPillActive: {
    backgroundColor: '#BFA35D',
    borderColor: '#BFA35D',
  },
  optionPillInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(191,163,93,0.15)',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyBlocked: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyBlockedText: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.35)',
  },
  blockedList: {
    gap: 0,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(191,163,93,0.1)',
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  blockedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  blockedAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  blockedNameCol: {
    flex: 1,
  },
  blockedName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  blockedUsername: {
    fontSize: 12,
    marginTop: 1,
    color: 'rgba(232,220,200,0.4)',
  },
  blockedDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  blockedDaysText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#C06060',
  },
  unblockButton: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderColor: '#C06060',
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#C06060',
  },
  spotifyToggleActive: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  musicSubLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(232,220,200,0.45)',
    marginBottom: 8,
  },
  musicHint: {
    fontSize: 11,
    color: 'rgba(232,220,200,0.3)',
    marginTop: 8,
    lineHeight: 16,
  },
});
