import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import type { ChatHeaderProps } from './types';

function ChatHeaderInner({ partnerName, isFriend, onBack, topInset }: ChatHeaderProps) {
  return (
    <LinearGradient
      colors={['#1e1d1a', '#1a1918', '#161618']}
      style={[styles.header, { paddingTop: topInset }]}
    >
      <View style={styles.headerDecor}>
        <View style={styles.headerDecoLine1} />
        <View style={styles.headerDecoLine2} />
      </View>

      <View style={styles.headerContent}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={12}
        >
          <ChevronLeft size={22} color="#BFA35D" />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {partnerName}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.headerStatusDot, isFriend && styles.headerStatusDotOnline]} />
            <Text style={styles.headerSubtitle}>
              {isFriend ? 'Freund' : 'Nachricht'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>
    </LinearGradient>
  );
}

export default React.memo(ChatHeaderInner);

const styles = StyleSheet.create({
  header: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  headerDecor: {
    ...StyleSheet.absoluteFillObject,
  },
  headerDecoLine1: {
    position: 'absolute' as const,
    left: -30,
    right: -30,
    top: '40%' as unknown as number,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.04)',
    transform: [{ rotate: '-3deg' }],
  },
  headerDecoLine2: {
    position: 'absolute' as const,
    left: -30,
    right: -30,
    top: '70%' as unknown as number,
    height: 1,
    backgroundColor: 'rgba(191,163,93,0.03)',
    transform: [{ rotate: '2deg' }],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    letterSpacing: 0.2,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(142,142,147,0.3)',
  },
  headerStatusDotOnline: {
    backgroundColor: '#4CAF50',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  headerRight: {
    width: 38,
  },
});
