import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Mail,
  MessageSquare,
  HelpCircle,
  Send,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useAlert } from '@/providers/AlertProvider';

const SUPPORT_EMAIL = 'support@hoffnungstraeger.app';

const FAQ_ITEMS = [
  {
    q: 'Wie kann ich mein Passwort ändern?',
    a: 'Gehe zu Einstellungen → Profil bearbeiten. Dort findest du die Option zum Ändern deines Passworts.',
  },
  {
    q: 'Wie lösche ich mein Konto?',
    a: 'Kontaktiere uns per E-Mail oder über das Kontaktformular unten. Wir werden dein Konto innerhalb von 30 Tagen löschen.',
  },
  {
    q: 'Wie melde ich unangemessene Inhalte?',
    a: 'Tippe auf die drei Punkte bei einem Beitrag und wähle "Melden". Unser Team prüft die Meldung.',
  },
  {
    q: 'Warum sehe ich bestimmte Beiträge nicht?',
    a: 'Manche Inhalte sind nur für Freunde sichtbar. Sende eine Freundschaftsanfrage, um mehr zu sehen.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSendEmail = useCallback(() => {
    const emailBody = `${message}\n\n---\nNutzer: ${user?.name || 'Unbekannt'}\nE-Mail: ${user?.email || 'Unbekannt'}`;
    const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || 'Support-Anfrage')}&body=${encodeURIComponent(emailBody)}`;
    Linking.openURL(mailUrl).catch(() => {
      showAlert('Fehler', 'E-Mail App konnte nicht geöffnet werden.');
    });
  }, [subject, message, user, showAlert]);

  const handleSubmit = useCallback(() => {
    if (!message.trim()) {
      showAlert('Hinweis', 'Bitte gib eine Nachricht ein.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleSendEmail();
  }, [message, handleSendEmail, showAlert]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
        <Text style={styles.heroTitle}>Hilfe & Support</Text>
        <Text style={styles.heroSub}>Wir helfen dir gerne weiter</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Pressable
          style={styles.quickAction}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
              showAlert('Fehler', 'E-Mail App konnte nicht geöffnet werden.');
            });
          }}
          testID="support-email-btn"
        >
          <View style={styles.quickActionIcon}>
            <Mail size={20} color="#BFA35D" />
          </View>
          <View style={styles.quickActionText}>
            <Text style={styles.quickActionTitle}>E-Mail senden</Text>
            <Text style={styles.quickActionSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <ChevronRight size={18} color="rgba(191,163,93,0.3)" />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={18} color="#BFA35D" />
            <Text style={styles.sectionTitle}>Häufige Fragen</Text>
          </View>
          {FAQ_ITEMS.map((item, index) => (
            <Pressable
              key={index}
              style={styles.faqItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedFaq(expandedFaq === index ? null : index);
              }}
            >
              <Text style={styles.faqQuestion}>{item.q}</Text>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={18} color="#BFA35D" />
            <Text style={styles.sectionTitle}>Nachricht schreiben</Text>
          </View>

          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Betreff"
              placeholderTextColor="rgba(191,163,93,0.3)"
              value={subject}
              onChangeText={setSubject}
            />
            <View style={styles.inputDivider} />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Deine Nachricht..."
              placeholderTextColor="rgba(191,163,93,0.3)"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && styles.sendBtnPressed,
                !message.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!message.trim()}
              testID="support-send-btn"
            >
              <Send size={18} color="#1c1c1e" />
              <Text style={styles.sendBtnText}>Absenden</Text>
            </Pressable>
          </View>
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
  heroSub: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.15)',
    marginBottom: 24,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    color: '#E8DCC8',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickActionSub: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'rgba(191,163,93,0.6)',
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  faqItem: {
    backgroundColor: '#1e1e20',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  faqQuestion: {
    color: '#E8DCC8',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  faqAnswer: {
    color: 'rgba(232,220,200,0.6)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.08)',
  },
  formCard: {
    backgroundColor: '#1e1e20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  input: {
    color: '#E8DCC8',
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  inputDivider: {
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.08)',
  },
  messageInput: {
    minHeight: 120,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
    marginTop: 12,
  },
  sendBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
