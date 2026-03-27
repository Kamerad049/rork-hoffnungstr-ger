import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen } from 'lucide-react-native';
import type { Leitsatz } from '@/constants/types';

interface QuoteCardProps {
  leitsatz: Leitsatz;
}

export default React.memo(function QuoteCard({ leitsatz }: QuoteCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Leitsatz des Tages</Text>
        <BookOpen size={20} color="rgba(191,163,93,0.3)" />
      </View>
      <Text style={styles.text}>„{leitsatz.spruch}"</Text>
      <Text style={styles.dayTag}>Tag {leitsatz.tag} von 365</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  text: {
    color: '#E8DCC8',
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  dayTag: {
    color: 'rgba(191,163,93,0.5)',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
