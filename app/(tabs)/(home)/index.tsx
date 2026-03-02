import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Animated, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { ChevronRight, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import RankIcon from '@/components/RankIcon';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useStampPass } from '@/providers/StampPassProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { getLeitsatzDesTages } from '@/mocks/leitsaetze';
import PlaceCard from '@/components/PlaceCard';
import RestaurantCard from '@/components/RestaurantCard';
import NewsCard from '@/components/NewsCard';
import QuoteCard from '@/components/QuoteCard';
import type { Place, Restaurant, NewsArticle } from '@/constants/types';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');


export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const stampPass = useStampPass();
  const stamps = stampPass?.stamps ?? [];
  const rank = stampPass?.rank ?? { name: 'Neuling', minStamps: 0, icon: 'Eye' };
  const progress = stampPass?.progress ?? 0;
  const adminCtx = useAdmin();
  const news = adminCtx?.news ?? [];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const placesRef = useRef<FlatList>(null);
  const restaurantsRef = useRef<FlatList>(null);
  const leitsatz = useMemo(() => getLeitsatzDesTages(), []);
  const unreadActivityCount = 0;

  useEffect(() => {
    if (pathname === '/' || pathname === '/(tabs)/(home)') {
      try {
        placesRef.current?.scrollToOffset({ offset: 0, animated: false });
        restaurantsRef.current?.scrollToOffset({ offset: 0, animated: false });
      } catch (e) {
        console.log('[HOME] scroll reset error:', e);
      }
    }
  }, [pathname]);

  const bellScale = React.useRef(new Animated.Value(1)).current;
  const handleBellPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(bellScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(bellScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();
    router.push('/(tabs)/(home)/activity' as any);
  }, [bellScale, router]);

  const places = adminCtx?.places ?? [];
  const restaurants = adminCtx?.restaurants ?? [];
  const featuredPlaces = useMemo(() => places.slice(0, 8), [places]);
  const featuredRestaurants = useMemo(() => restaurants.slice(0, 6), [restaurants]);
  const latestNews = useMemo(() => news.slice(0, 4), [news]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }, []);

  const handleNewsPress = useCallback((article: NewsArticle) => {
    router.push({ pathname: '/(tabs)/(home)/article', params: { id: article.id } } as any);
  }, [router]);

  const renderPlace = useCallback(({ item }: { item: Place }) => (
    <PlaceCard place={item} compact />
  ), []);

  const renderRestaurant = useCallback(({ item }: { item: Restaurant }) => (
    <RestaurantCard restaurant={item} compact />
  ), []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e1d1a', '#1a1918', '#141416', 'transparent']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      >
        <View style={styles.heroPattern}>
          {[...Array(12)].map((_, i) => (
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
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>
                {user?.name ?? 'Entdecker'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={handleBellPress} hitSlop={12} testID="bell-button">
                <Animated.View style={[styles.bellWrap, { transform: [{ scale: bellScale }] }]}>
                  <Bell size={22} color="#E8DCC8" />
                  {unreadActivityCount > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>
                        {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              </Pressable>
              <View style={styles.rankBadge}>
                <RankIcon icon={rank.icon} size={16} color="#BFA35D" />
                <Text style={styles.rankName}>{rank.name}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.contentArea}>
          <QuoteCard leitsatz={leitsatz} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Orte entdecken</Text>
            <Pressable onPress={() => router.push('/places' as any)} style={styles.seeAllBtn} hitSlop={8}>
              <Text style={styles.seeAllText}>Alle</Text>
              <ChevronRight size={16} color="#BFA35D" />
            </Pressable>
          </View>
          <FlatList
            ref={placesRef}
            data={featuredPlaces}
            renderItem={renderPlace}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            scrollEnabled
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deutsche Küche</Text>
            <Pressable onPress={() => router.push('/cuisine' as any)} style={styles.seeAllBtn} hitSlop={8}>
              <Text style={styles.seeAllText}>Alle</Text>
              <ChevronRight size={16} color="#BFA35D" />
            </Pressable>
          </View>
          <FlatList
            ref={restaurantsRef}
            data={featuredRestaurants}
            renderItem={renderRestaurant}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            scrollEnabled
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Neuigkeiten</Text>
          </View>
          {latestNews.map((article) => (
            <View key={article.id} style={styles.newsWrapper}>
              <NewsCard article={article} onPress={handleNewsPress} />
            </View>
          ))}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141416',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    zIndex: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    paddingBottom: 24,
    paddingHorizontal: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
    color: 'rgba(191,163,93,0.5)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E85D75',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1e1d1a',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#BFA35D',
  },
  contentArea: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: '#E8DCC8',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  horizontalList: {
    paddingBottom: 16,
  },
  newsWrapper: {
    paddingHorizontal: 0,
  },
});
