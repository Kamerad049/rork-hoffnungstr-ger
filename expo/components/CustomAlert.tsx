import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface CustomAlertProps {
  visible: boolean;
  config: AlertConfig | null;
  onDismiss: () => void;
}

function CustomAlertInner({ visible, config, onDismiss }: CustomAlertProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handlePress = useCallback((button: AlertButton) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
      button.onPress?.();
    });
  }, [onDismiss, scaleAnim, opacityAnim]);

  const handleBackdrop = useCallback(() => {
    if (!config?.buttons || config.buttons.length === 0) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }
  }, [config, onDismiss, scaleAnim, opacityAnim]);

  if (!config) return null;

  const alertType = config.type ?? 'info';
  const buttons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const getIconColor = () => {
    switch (alertType) {
      case 'warning': return '#D4A017';
      case 'error': return colors.red;
      case 'success': return '#5A9E6F';
      default: return colors.accent;
    }
  };

  const getIconBg = () => {
    switch (alertType) {
      case 'warning': return 'rgba(212,160,23,0.12)';
      case 'error': return colors.redLight;
      case 'success': return 'rgba(90,158,111,0.12)';
      default: return colors.accentLight;
    }
  };

  const IconComponent = () => {
    const iconColor = getIconColor();
    const size = 28;
    switch (alertType) {
      case 'warning': return <AlertTriangle size={size} color={iconColor} />;
      case 'error': return <XCircle size={size} color={iconColor} />;
      case 'success': return <CheckCircle size={size} color={iconColor} />;
      default: return <Info size={size} color={iconColor} />;
    }
  };

  const getButtonStyle = (btn: AlertButton) => {
    if (btn.style === 'destructive') {
      return {
        bg: colors.red,
        text: '#FFFFFF',
        border: colors.red,
      };
    }
    if (btn.style === 'cancel') {
      return {
        bg: 'transparent',
        text: colors.tertiaryText,
        border: colors.border,
      };
    }
    return {
      bg: colors.accent,
      text: '#1c1c1e',
      border: colors.accent,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackdrop}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable style={styles.backdrop} onPress={handleBackdrop} />
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
            <IconComponent />
          </View>

          <Text style={[styles.title, { color: colors.primaryText }]}>
            {config.title}
          </Text>

          {config.message ? (
            <Text style={[styles.message, { color: colors.tertiaryText }]}>
              {config.message}
            </Text>
          ) : null}

          <View style={[
            styles.buttonRow,
            buttons.length === 1 && styles.buttonRowSingle,
          ]}>
            {buttons.map((btn, idx) => {
              const btnStyle = getButtonStyle(btn);
              const isCancel = btn.style === 'cancel';
              return (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.button,
                    buttons.length > 1 && styles.buttonFlex,
                    {
                      backgroundColor: pressed
                        ? isCancel ? colors.surfaceSecondary : btnStyle.bg
                        : btnStyle.bg,
                      borderColor: btnStyle.border,
                      borderWidth: isCancel ? 1 : 0,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => handlePress(btn)}
                  testID={`alert-btn-${idx}`}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: btnStyle.text,
                        fontWeight: isCancel ? '500' as const : '700' as const,
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default React.memo(CustomAlertInner);

const { width } = Dimensions.get('window');
const ALERT_WIDTH = Math.min(width - 48, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertContainer: {
    width: ALERT_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
