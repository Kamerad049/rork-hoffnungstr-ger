import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useOnlineManager } from '@/hooks/useNetworkStatus';

function OfflineBannerInner() {
  const isOnline = useOnlineManager();
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const reconnectAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else if (wasOffline) {
      Animated.timing(reconnectAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setWasOffline(false);
          reconnectAnim.setValue(0);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, slideAnim, reconnectAnim]);

  if (!wasOffline && isOnline) return null;

  const bgColor = isOnline
    ? 'rgba(52,199,89,0.95)'
    : 'rgba(200,60,60,0.95)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {isOnline ? (
        <Text style={styles.text}>Wieder verbunden</Text>
      ) : (
        <View style={styles.row}>
          <WifiOff size={16} color="#fff" />
          <Text style={styles.text}>Keine Internetverbindung</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default React.memo(OfflineBannerInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    paddingBottom: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
