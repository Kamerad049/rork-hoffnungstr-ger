import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.code, { color: colors.tertiaryText }]}>404</Text>
      <Text style={[styles.title, { color: colors.primaryText }]}>Seite nicht gefunden</Text>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.btnText}>Zur Startseite</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  code: {
    fontSize: 64,
    fontWeight: '900' as const,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 24,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
