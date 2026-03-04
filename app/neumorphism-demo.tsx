import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Menu,
  Image as ImageIcon,
  Bell,
  Heart,
  Star,
  Settings,
  User,
  Bookmark,
  TrendingUp,
  Zap,
  Crown,
  Shield,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#E4DDD4',
  bgLight: '#EDE7DF',
  bgDark: '#D5CEC5',
  shadowDark: '#B8B0A5',
  shadowLight: '#FEFAF5',
  shadowDarker: '#A49D93',
  shadowLighter: '#FFFFFF',
  accent: '#C4A55A',
  accentLight: '#D4B86A',
  accentDark: '#A48A3A',
  text: '#4A4540',
  textSecondary: '#8A8378',
  textLight: '#B0A89D',
  cardBg: '#E8E1D8',
  innerShadowDark: 'rgba(160, 150, 135, 0.5)',
  innerShadowLight: 'rgba(255, 252, 248, 0.8)',
};

function NeumorphicView({
  children,
  style,
  depth = 'medium',
  pressed = false,
}: {
  children?: React.ReactNode;
  style?: any;
  depth?: 'shallow' | 'medium' | 'deep' | 'extreme';
  pressed?: boolean;
}) {
  const shadows = {
    shallow: { offset: 3, radius: 6, darkOpacity: 0.2, lightOpacity: 0.7 },
    medium: { offset: 6, radius: 12, darkOpacity: 0.3, lightOpacity: 0.8 },
    deep: { offset: 10, radius: 20, darkOpacity: 0.4, lightOpacity: 0.9 },
    extreme: { offset: 14, radius: 28, darkOpacity: 0.5, lightOpacity: 1.0 },
  };

  const s = shadows[depth];

  if (Platform.OS === 'web') {
    const inset = pressed ? 'inset ' : '';
    const boxShadow = pressed
      ? `inset ${s.offset}px ${s.offset}px ${s.radius}px rgba(160,150,135,${s.darkOpacity}), inset -${s.offset}px -${s.offset}px ${s.radius}px rgba(255,252,248,${s.lightOpacity})`
      : `${s.offset}px ${s.offset}px ${s.radius}px rgba(160,150,135,${s.darkOpacity}), -${s.offset}px -${s.offset}px ${s.radius}px rgba(255,252,248,${s.lightOpacity})`;

    return (
      <View
        style={[
          {
            backgroundColor: COLORS.bg,
            // @ts-ignore
            boxShadow,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  const shadowStyles = pressed
    ? {
        shadowColor: COLORS.shadowDarker,
        shadowOffset: { width: s.offset / 2, height: s.offset / 2 },
        shadowOpacity: s.darkOpacity,
        shadowRadius: s.radius / 2,
        elevation: 1,
      }
    : {
        shadowColor: COLORS.shadowDarker,
        shadowOffset: { width: s.offset, height: s.offset },
        shadowOpacity: s.darkOpacity,
        shadowRadius: s.radius,
        elevation: s.offset,
      };

  return (
    <View style={[{ backgroundColor: COLORS.bg }, shadowStyles, style]}>
      {children}
    </View>
  );
}

function NeumorphicButton({
  children,
  onPress,
  style,
  depth = 'deep',
  circular = false,
  size = 48,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  depth?: 'shallow' | 'medium' | 'deep' | 'extreme';
  circular?: boolean;
  size?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <NeumorphicView
          depth={isPressed ? 'shallow' : depth}
          pressed={isPressed}
          style={[
            circular
              ? {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              : {
                  borderRadius: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
            style,
          ]}
        >
          {children}
        </NeumorphicView>
      </Animated.View>
    </Pressable>
  );
}

function GoldenLine({ width: lineWidth = '100%' }: { width?: string | number }) {
  return (
    <View style={[styles.goldenLine, { width: lineWidth as any }]}>
      <View style={styles.goldenLineInner} />
      <View style={styles.goldenLineGlow} />
    </View>
  );
}

function NeumorphicToggle() {
  const [active, setActive] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const newVal = !active;
    setActive(newVal);
    Animated.spring(translateX, {
      toValue: newVal ? 32 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable onPress={toggle}>
      <NeumorphicView
        depth="deep"
        pressed={true}
        style={styles.toggleTrack}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <NeumorphicView depth="extreme" style={styles.toggleThumb}>
            {active && <View style={styles.toggleActiveIndicator} />}
          </NeumorphicView>
        </Animated.View>
      </NeumorphicView>
    </Pressable>
  );
}

function NeumorphicCard({
  title,
  subtitle,
  date,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  date: string;
  icon: any;
}) {
  return (
    <NeumorphicView depth="extreme" style={styles.card}>
      <NeumorphicView depth="medium" pressed={true} style={styles.cardImageContainer}>
        <Icon size={28} color={COLORS.accent} />
      </NeumorphicView>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text>
      <Text style={styles.cardDate}>{date}</Text>
    </NeumorphicView>
  );
}

function NeumorphicProgressBar({ progress }: { progress: number }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <NeumorphicView depth="deep" pressed={true} style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </NeumorphicView>
  );
}

function StatItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <NeumorphicView depth="deep" style={styles.statItem}>
      <NeumorphicView depth="medium" pressed={true} style={styles.statIconContainer}>
        <Icon size={20} color={COLORS.accent} />
      </NeumorphicView>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </NeumorphicView>
  );
}

export default function NeumorphismDemoScreen() {
  const router = useRouter();
  const [activePage, setActivePage] = useState(1);
  const heroLineAnim1 = useRef(new Animated.Value(0)).current;
  const heroLineAnim2 = useRef(new Animated.Value(0)).current;
  const heroLineAnim3 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(heroLineAnim1, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(heroLineAnim2, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(heroLineAnim3, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Hero Section with Golden Lines */}
            <View style={styles.heroSection}>
              <View style={styles.heroHeader}>
                <NeumorphicButton
                  circular
                  size={44}
                  depth="deep"
                  onPress={() => router.back()}
                >
                  <ArrowLeft size={20} color={COLORS.text} />
                </NeumorphicButton>
                <Text style={styles.heroTitle}>Neumorphism</Text>
                <View style={styles.heroActions}>
                  <NeumorphicButton circular size={44} depth="deep">
                    <Search size={18} color={COLORS.text} />
                  </NeumorphicButton>
                  <NeumorphicButton circular size={44} depth="deep" style={{ marginLeft: 12 }}>
                    <Menu size={18} color={COLORS.text} />
                  </NeumorphicButton>
                </View>
              </View>

              {/* Animated Golden Lines */}
              <View style={styles.goldenLinesContainer}>
                <Animated.View
                  style={[
                    styles.heroGoldenLine,
                    {
                      width: heroLineAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '80%'],
                      }),
                      opacity: heroLineAnim1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.heroGoldenLine,
                    styles.heroGoldenLine2,
                    {
                      width: heroLineAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '60%'],
                      }),
                      opacity: heroLineAnim2,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.heroGoldenLine,
                    styles.heroGoldenLine3,
                    {
                      width: heroLineAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '40%'],
                      }),
                      opacity: heroLineAnim3,
                    },
                  ]}
                />
              </View>

              <View style={styles.heroContent}>
                <NeumorphicView depth="extreme" style={styles.heroBadge}>
                  <Crown size={24} color={COLORS.accent} />
                </NeumorphicView>
                <Text style={styles.heroSubtitle}>Premium Experience</Text>
                <Text style={styles.heroDescription}>
                  Extreme depth & tactile design
                </Text>
              </View>
              <GoldenLine />
            </View>

            {/* Stats Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistiken</Text>
              <View style={styles.statsRow}>
                <StatItem icon={Heart} value="2.4K" label="Likes" />
                <StatItem icon={Star} value="4.8" label="Rating" />
                <StatItem icon={TrendingUp} value="+18%" label="Growth" />
              </View>
            </View>

            {/* Cards Section - like the reference image */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Blog</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsScrollContent}
              >
                <NeumorphicCard
                  title="Tiefe im Design"
                  subtitle="Wie extreme Schatten und Licht echte 3D-Effekte erzeugen..."
                  date="4. März 2026"
                  icon={ImageIcon}
                />
                <NeumorphicCard
                  title="Material Design Updates"
                  subtitle="Die neuesten Trends in der mobilen UI-Gestaltung..."
                  date="2. März 2026"
                  icon={Zap}
                />
                <NeumorphicCard
                  title="Gold & Cream"
                  subtitle="Warme Farbpaletten für edle App-Designs..."
                  date="28. Feb 2026"
                  icon={Crown}
                />
              </ScrollView>
            </View>

            {/* Pagination like reference */}
            <View style={styles.paginationContainer}>
              <NeumorphicButton circular size={44} depth="deep">
                <ArrowLeft size={16} color={COLORS.text} />
              </NeumorphicButton>
              <View style={styles.paginationDots}>
                {[0, 1, 2].map((i) => (
                  <Pressable key={i} onPress={() => setActivePage(i)}>
                    <NeumorphicView
                      depth={activePage === i ? 'shallow' : 'deep'}
                      pressed={activePage === i}
                      style={[
                        styles.paginationDot,
                        activePage === i && styles.paginationDotActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paginationText,
                          activePage === i && styles.paginationTextActive,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </NeumorphicView>
                  </Pressable>
                ))}
              </View>
              <NeumorphicButton circular size={44} depth="deep">
                <ArrowRight size={16} color={COLORS.text} />
              </NeumorphicButton>
            </View>

            {/* Controls Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steuerung</Text>
              <NeumorphicView depth="extreme" style={styles.controlsCard}>
                <View style={styles.controlRow}>
                  <View style={styles.controlInfo}>
                    <Bell size={18} color={COLORS.accent} />
                    <Text style={styles.controlLabel}>Benachrichtigungen</Text>
                  </View>
                  <NeumorphicToggle />
                </View>
                <View style={styles.controlDivider} />
                <View style={styles.controlRow}>
                  <View style={styles.controlInfo}>
                    <Shield size={18} color={COLORS.accent} />
                    <Text style={styles.controlLabel}>Privatsphäre</Text>
                  </View>
                  <NeumorphicToggle />
                </View>
                <View style={styles.controlDivider} />
                <View style={styles.controlRow}>
                  <View style={styles.controlInfo}>
                    <Bookmark size={18} color={COLORS.accent} />
                    <Text style={styles.controlLabel}>Lesezeichen sync</Text>
                  </View>
                  <NeumorphicToggle />
                </View>
              </NeumorphicView>
            </View>

            {/* Progress Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fortschritt</Text>
              <NeumorphicView depth="extreme" style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Level 12</Text>
                  <Text style={styles.progressPercent}>78%</Text>
                </View>
                <NeumorphicProgressBar progress={0.78} />
                <Text style={styles.progressSubtext}>2.200 / 3.000 XP</Text>
              </NeumorphicView>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aktionen</Text>
              <View style={styles.actionButtonsRow}>
                <NeumorphicButton depth="extreme" style={styles.actionButton}>
                  <View style={styles.actionButtonContent}>
                    <Settings size={20} color={COLORS.accent} />
                    <Text style={styles.actionButtonText}>Einstellungen</Text>
                  </View>
                </NeumorphicButton>
                <NeumorphicButton depth="extreme" style={styles.actionButton}>
                  <View style={styles.actionButtonContent}>
                    <User size={20} color={COLORS.accent} />
                    <Text style={styles.actionButtonText}>Profil</Text>
                  </View>
                </NeumorphicButton>
              </View>
            </View>

            {/* Bottom Golden Accent */}
            <View style={styles.bottomAccent}>
              <GoldenLine />
              <Text style={styles.bottomText}>Crafted with depth & soul</Text>
              <GoldenLine width="40%" />
            </View>

            <View style={{ height: 40 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldenLinesContainer: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  heroGoldenLine: {
    height: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 1,
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 8px ${COLORS.accentLight}, 0 0 16px rgba(196,165,90,0.3)` }
      : {
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
        }) as any,
  },
  heroGoldenLine2: {
    height: 1.5,
    opacity: 0.7,
    marginLeft: 20,
  },
  heroGoldenLine3: {
    height: 1,
    opacity: 0.4,
    marginLeft: 40,
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  goldenLine: {
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  goldenLineInner: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  goldenLineGlow: {
    position: 'absolute',
    width: '60%',
    height: 2,
    backgroundColor: COLORS.accentLight,
    opacity: 0.3,
    borderRadius: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  cardsScrollContent: {
    paddingRight: 20,
    gap: 16,
  },
  card: {
    width: SCREEN_WIDTH * 0.42,
    borderRadius: 22,
    padding: 16,
  },
  cardImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600' as const,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paginationDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDotActive: {
    backgroundColor: COLORS.bgDark,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  paginationTextActive: {
    color: COLORS.accent,
    fontWeight: '700' as const,
  },
  controlsCard: {
    borderRadius: 24,
    padding: 6,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  controlDivider: {
    height: 1,
    backgroundColor: COLORS.bgDark,
    marginHorizontal: 18,
    opacity: 0.6,
  },
  toggleTrack: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  progressCard: {
    borderRadius: 24,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.accent,
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: `linear-gradient(90deg, ${COLORS.accentDark}, ${COLORS.accent}, ${COLORS.accentLight})`,
          boxShadow: `0 0 10px ${COLORS.accentLight}`,
        }
      : {
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
        }) as any,
  },
  progressSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    fontWeight: '500' as const,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  bottomAccent: {
    marginTop: 36,
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  bottomText: {
    fontSize: 12,
    color: COLORS.textLight,
    letterSpacing: 2,
    fontWeight: '500' as const,
    textTransform: 'uppercase',
  },
});
