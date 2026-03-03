import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';

export default function ImpressumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <Text style={styles.heroTitle}>Impressum</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Angaben gemäß § 5 TMG</Text>
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Betreiber</Text>
          <Text style={styles.fieldValue}>Hoffnungsträger</Text>

          <Text style={styles.fieldLabel}>Vertreten durch</Text>
          <Text style={styles.fieldValue}>[Name des Betreibers]</Text>

          <Text style={styles.fieldLabel}>Anschrift</Text>
          <Text style={styles.fieldValue}>
            [Straße Nr.]{'\n'}
            [PLZ Ort]{'\n'}
            Deutschland
          </Text>

          <Text style={styles.fieldLabel}>Kontakt</Text>
          <Text style={styles.fieldValue}>
            E-Mail: [kontakt@hoffnungstraeger.app]{'\n'}
            Telefon: [+49 XXX XXXXXXX]
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Haftungshinweis</Text>
          <View style={styles.divider} />
          <Text style={styles.fieldValue}>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Urheberrecht</Text>
          <View style={styles.divider} />
          <Text style={styles.fieldValue}>
            Die durch den Betreiber erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Streitschlichtung</Text>
          <View style={styles.divider} />
          <Text style={styles.fieldValue}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit.
          </Text>
          <Pressable
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://ec.europa.eu/consumers/odr/')}
          >
            <Text style={styles.linkText}>ec.europa.eu/consumers/odr/</Text>
            <ExternalLink size={14} color="#BFA35D" />
          </Pressable>
          <Text style={[styles.fieldValue, { marginTop: 10 }]}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </Text>
        </View>

        <Text style={styles.lastUpdated}>Stand: März 2026</Text>
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
    paddingBottom: 60,
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  cardLabel: {
    color: '#BFA35D',
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.1)',
    marginVertical: 14,
  },
  fieldLabel: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
  },
  fieldValue: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 14,
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  linkText: {
    color: '#BFA35D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lastUpdated: {
    color: 'rgba(191,163,93,0.35)',
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 8,
  },
});
