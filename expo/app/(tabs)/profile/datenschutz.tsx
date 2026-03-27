import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. Verantwortlicher',
    text: 'Verantwortlich f\u00fcr die Datenverarbeitung in dieser App ist der Betreiber der App Hoffnungstr\u00e4ger. Kontaktdaten finden Sie im Impressum.',
  },
  {
    title: '2. Erhobene Daten',
    text: 'Bei der Nutzung unserer App erheben wir folgende Daten:\n\n\u2022 Registrierungsdaten (Name, E-Mail-Adresse)\n\u2022 Profilinformationen (optional: Geschlecht, Religion)\n\u2022 Nutzungsdaten (Beitr\u00e4ge, Kommentare, Bewertungen)\n\u2022 Standortdaten (nur bei aktiver Nutzung der Karte)\n\u2022 Ger\u00e4teinformationen (Ger\u00e4tetyp, Betriebssystem)',
  },
  {
    title: '3. Zweck der Datenverarbeitung',
    text: 'Wir verarbeiten Ihre Daten ausschlie\u00dflich zur Bereitstellung und Verbesserung unserer App-Dienste, zur Kommunikation zwischen Nutzern sowie zur Gew\u00e4hrleistung der Sicherheit der Plattform.',
  },
  {
    title: '4. Rechtsgrundlage',
    text: 'Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a (Einwilligung), lit. b (Vertragserf\u00fcllung) und lit. f (berechtigtes Interesse) DSGVO.',
  },
  {
    title: '5. Datenweitergabe',
    text: 'Ihre Daten werden nicht an Dritte verkauft. Eine Weitergabe erfolgt nur an Dienstleister, die zur Bereitstellung der App erforderlich sind (z.B. Hosting-Anbieter), und nur unter Einhaltung der DSGVO.',
  },
  {
    title: '6. Speicherdauer',
    text: 'Ihre Daten werden so lange gespeichert, wie Ihr Konto aktiv ist. Nach L\u00f6schung des Kontos werden Ihre personenbezogenen Daten innerhalb von 30 Tagen gel\u00f6scht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.',
  },
  {
    title: '7. Ihre Rechte',
    text: 'Sie haben das Recht auf Auskunft, Berichtigung, L\u00f6schung, Einschr\u00e4nkung der Verarbeitung, Daten\u00fcbertragbarkeit und Widerspruch. Wenden Sie sich hierf\u00fcr an unseren Support.',
  },
  {
    title: '8. Kontakt',
    text: 'Bei Fragen zum Datenschutz wenden Sie sich bitte an unseren Support \u00fcber die App oder per E-Mail.',
  },
];

export default function DatenschutzScreen() {
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
        <Text style={styles.heroTitle}>{'Datenschutzerkl\u00e4rung'}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}
        <Text style={styles.lastUpdated}>{'Stand: M\u00e4rz 2026'}</Text>
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
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  sectionTitle: {
    color: '#BFA35D',
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  sectionText: {
    color: 'rgba(232,220,200,0.7)',
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdated: {
    color: 'rgba(191,163,93,0.35)',
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 8,
  },
});
