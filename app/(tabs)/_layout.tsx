import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Award, Trophy, User, Dumbbell, MapPin, Newspaper, Gamepad2 } from 'lucide-react-native';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';


function BadgeIcon({ icon: Icon, size, color, badge, badgeColor }: { icon: any; size: number; color: string; badge: number; badgeColor: string }) {
  return (
    <View style={badgeStyles.container}>
      <Icon size={size} color={color} />
      {badge > 0 && (
        <View style={[badgeStyles.badge, { backgroundColor: badgeColor }]}>
          <Text style={badgeStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: {
            backgroundColor: '#141416',
            borderTopColor: 'rgba(191,163,93,0.08)',
            borderTopWidth: 0.5,
            ...(Platform.OS === 'web' ? { height: 60 } : {}),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600' as const,
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'Start',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size }) => <Newspaper size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stamps"
          options={{
            title: 'Stempel',
            tabBarIcon: ({ color, size }) => <Award size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="ranking"
          options={{
            title: 'Ranking',
            tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="spiele"
          options={{
            title: 'Spiele',
            tabBarIcon: ({ color, size }) => <Gamepad2 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="kaderschmiede"
          options={{
            title: 'Kader',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="livemap"
          options={{
            title: 'Karte',
            tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="places"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="cuisine"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#1c1c1e',
    fontSize: 10,
    fontWeight: '800' as const,
  },
});


