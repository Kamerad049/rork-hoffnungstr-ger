import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, Pressable, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import WaxSealStamp from './WaxSealStamp';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WaxSealCeremonyProps {
  visible: boolean;
  placeName: string;
  onClose: () => void;
}

const NUM_WAX_DROPS = 16;

export default function WaxSealCeremony({ visible, placeName, onClose }: WaxSealCeremonyProps) {
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sealScale = useRef(new Animated.Value(0)).current;
  const impactFlash = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dropAnims = useRef(
    Array.from({ length: NUM_WAX_DROPS }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    overlayAnim.setValue(0);
    sealScale.setValue(0);
    impactFlash.setValue(0);
    textAnim.setValue(0);
    btnAnim.setValue(0);
    ribbonAnim.setValue(0);
    shakeAnim.setValue(0);
    dropAnims.forEach(d => {
      d.x.setValue(0);
      d.y.setValue(0);
      d.opacity.setValue(0);
      d.scale.setValue(0);
    });

    Animated.sequence([
      Animated.timing(overlayAnim, { toValue: 1, duration: 350, useNativeDriver: true }),

      Animated.parallel([
        Animated.sequence([
          Animated.timing(sealScale, { toValue: 2.2, duration: 200, useNativeDriver: true }),
          Animated.spring(sealScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(impactFlash, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(impactFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -5, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]),
        ]),
      ]),

      Animated.parallel([
        ...dropAnims.map((d, i) => {
          const angle = (i / NUM_WAX_DROPS) * Math.PI * 2;
          const dist = 60 + Math.random() * 50;
          return Animated.parallel([
            Animated.timing(d.x, { toValue: Math.cos(angle) * dist, duration: 500 + Math.random() * 200, useNativeDriver: true }),
            Animated.timing(d.y, { toValue: Math.sin(angle) * dist + 20, duration: 500 + Math.random() * 200, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(d.opacity, { toValue: 0.9, duration: 100, useNativeDriver: true }),
              Animated.timing(d.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
            Animated.timing(d.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]);
        }),
      ]),

      Animated.stagger(120, [
        Animated.timing(ribbonAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(btnAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 550);

    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 250);
  }, [visible]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(sealScale, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, overlayAnim, sealScale]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Animated.View style={[styles.flashOverlay, { opacity: impactFlash }]} />

        <Animated.View style={[styles.centerContent, { transform: [{ translateX: shakeAnim }] }]}>
          {dropAnims.map((d, i) => (
            <Animated.View
              key={`drop-${i}`}
              style={[
                styles.waxDrop,
                {
                  width: 4 + (i % 3) * 3,
                  height: 4 + (i % 3) * 3,
                  borderRadius: 6,
                  backgroundColor: i % 2 === 0 ? '#B22222' : '#8B1A1A',
                  opacity: d.opacity,
                  transform: [
                    { translateX: d.x },
                    { translateY: d.y },
                    { scale: d.scale },
                  ],
                },
              ]}
            />
          ))}

          <Animated.View style={{ transform: [{ scale: sealScale }] }}>
            <WaxSealStamp size={160} color="red" showShine />
          </Animated.View>

          <Animated.View
            style={[
              styles.ribbonWrap,
              {
                opacity: ribbonAnim,
                transform: [{
                  translateY: ribbonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>GESIEGELT</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textBlock,
              {
                opacity: textAnim,
                transform: [{
                  translateY: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [25, 0],
                  }),
                }],
              },
            ]}
          >
            <Text style={styles.titleText}>Stempel gesammelt!</Text>
            <Text style={styles.placeText}>{placeName}</Text>
            <Text style={styles.subText}>
              Dieser Ort wurde in deinem Stempelpass verewigt.
            </Text>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
            <Pressable
              style={styles.closeBtn}
              onPress={handleClose}
              testID="wax-seal-close-btn"
            >
              <Text style={styles.closeBtnText}>Weiter</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,6,4,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(178,34,34,0.15)',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waxDrop: {
    position: 'absolute',
  },
  ribbonWrap: {
    marginTop: 24,
    marginBottom: 16,
  },
  ribbon: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(178,34,34,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(178,34,34,0.3)',
  },
  ribbonText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 4,
    color: '#D44040',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 36,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: '#E8DCC8',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  placeText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#BFA35D',
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(232,220,200,0.45)',
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  closeBtn: {
    paddingHorizontal: 44,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: 'rgba(178,34,34,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(178,34,34,0.4)',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#D44040',
  },
});
