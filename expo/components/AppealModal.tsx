import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { X, Scale, CheckCircle, ThumbsUp, ThumbsDown, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { ModerationAction } from '@/constants/types';

interface AppealModalProps {
  visible: boolean;
  onClose: () => void;
  action: ModerationAction | null;
  onSubmitAppeal: (actionId: string, appealText: string) => Promise<boolean>;
  onAcceptDecision: (actionId: string) => void;
}

type Step = 'choice' | 'appeal' | 'success' | 'accepted';

function AppealModalInner({ visible, onClose, action, onSubmitAppeal, onAcceptDecision }: AppealModalProps) {
  const [step, setStep] = useState<Step>('choice');
  const [appealText, setAppealText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const reset = useCallback(() => {
    setStep('choice');
    setAppealText('');
    setIsSubmitting(false);
    successAnim.setValue(0);
  }, [successAnim]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleAccept = useCallback(() => {
    if (!action) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAcceptDecision(action.id);
    setStep('accepted');
    setTimeout(() => handleClose(), 2000);
  }, [action, onAcceptDecision, handleClose]);

  const handleSubmitAppeal = useCallback(async () => {
    if (!action || !appealText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const success = await onSubmitAppeal(action.id, appealText.trim());
    setIsSubmitting(false);

    if (success) {
      setStep('success');
      Animated.spring(successAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
      setTimeout(() => handleClose(), 2500);
    }
  }, [action, appealText, isSubmitting, onSubmitAppeal, handleClose, successAnim]);

  if (!action) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={{ width: 30 }} />
            <Text style={styles.sheetTitle}>
              {step === 'success' ? 'Widerspruch eingereicht' : step === 'accepted' ? 'Entscheidung akzeptiert' : 'Dein Beitrag wurde entfernt'}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={22} color="rgba(191,163,93,0.5)" />
            </Pressable>
          </View>

          {step === 'choice' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.infoBox}>
                <Scale size={20} color="#E8A44E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Moderations-Entscheidung</Text>
                  <Text style={styles.infoText}>
                    Dein Beitrag wurde von einem Moderator entfernt.
                  </Text>
                </View>
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Grund</Text>
                <Text style={styles.reasonValue}>{action.reason}</Text>
                {action.details.length > 0 && (
                  <>
                    <Text style={[styles.reasonLabel, { marginTop: 10 }]}>Details</Text>
                    <Text style={styles.reasonValue}>{action.details}</Text>
                  </>
                )}
              </View>

              <Text style={styles.choiceTitle}>Wie möchtest du reagieren?</Text>

              <Pressable
                style={styles.choiceBtn}
                onPress={handleAccept}
                testID="appeal-accept"
              >
                <View style={[styles.choiceIconWrap, { backgroundColor: 'rgba(76,175,80,0.1)' }]}>
                  <ThumbsUp size={22} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceBtnTitle}>Ich akzeptiere die Entscheidung</Text>
                  <Text style={styles.choiceBtnSub}>
                    Der Beitrag bleibt entfernt. Keine weiteren Schritte.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.choiceBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('appeal');
                }}
                testID="appeal-object"
              >
                <View style={[styles.choiceIconWrap, { backgroundColor: 'rgba(232,164,78,0.1)' }]}>
                  <ThumbsDown size={22} color="#E8A44E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceBtnTitle}>Widerspruch einlegen</Text>
                  <Text style={styles.choiceBtnSub}>
                    Ich halte die Entfernung für ungerechtfertigt und möchte eine erneute Prüfung.
                  </Text>
                </View>
              </Pressable>

              <View style={styles.processInfo}>
                <FileText size={14} color="rgba(191,163,93,0.4)" />
                <Text style={styles.processText}>
                  Bei einem Widerspruch wird dein Beitrag erneut geprüft. Wird dem Widerspruch stattgegeben, wird der Beitrag wiederhergestellt. Andernfalls wird er endgültig gelöscht.
                </Text>
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {step === 'appeal' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.appealLabel}>Begründe deinen Widerspruch</Text>
              <Text style={styles.appealHint}>
                Erkläre, warum du die Entfernung für ungerechtfertigt hältst. Sei sachlich und konkret.
              </Text>

              <TextInput
                style={styles.appealInput}
                placeholder="Beschreibe, warum dein Beitrag nicht gegen die Richtlinien verstößt..."
                placeholderTextColor="rgba(191,163,93,0.3)"
                multiline
                numberOfLines={6}
                maxLength={1000}
                value={appealText}
                onChangeText={setAppealText}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={styles.charCount}>{appealText.length}/1000</Text>

              <Pressable
                style={[
                  styles.submitBtn,
                  (!appealText.trim() || isSubmitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmitAppeal}
                disabled={!appealText.trim() || isSubmitting}
                testID="appeal-submit"
              >
                <Scale size={18} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Wird eingereicht...' : 'Widerspruch einreichen'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelLink}
                onPress={() => setStep('choice')}
              >
                <Text style={styles.cancelLinkText}>Zurück</Text>
              </Pressable>

              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {step === 'success' && (
            <Animated.View style={[styles.successBody, {
              opacity: successAnim,
              transform: [{
                scale: successAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.05, 1],
                }),
              }],
            }]}>
              <View style={styles.successIconWrap}>
                <Scale size={48} color="#E8A44E" />
              </View>
              <Text style={styles.successTitle}>Widerspruch eingereicht</Text>
              <Text style={styles.successText}>
                Dein Widerspruch wird von einem Moderator erneut geprüft. Du erhältst eine Benachrichtigung über das Ergebnis.
              </Text>
            </Animated.View>
          )}

          {step === 'accepted' && (
            <View style={styles.successBody}>
              <View style={[styles.successIconWrap, { backgroundColor: 'rgba(76,175,80,0.1)' }]}>
                <CheckCircle size={48} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Entscheidung akzeptiert</Text>
              <Text style={styles.successText}>
                Vielen Dank für dein Verständnis.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default React.memo(AppealModalInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1a1918',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.1)',
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(191,163,93,0.08)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    textAlign: 'center',
    flex: 1,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(232,164,78,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,164,78,0.15)',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8A44E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 18,
  },
  reasonBox: {
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasonValue: {
    fontSize: 14,
    color: '#E8DCC8',
    lineHeight: 20,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 12,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(191,163,93,0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  choiceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  choiceBtnSub: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.5)',
    lineHeight: 16,
  },
  processInfo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  processText: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.4)',
    lineHeight: 17,
    flex: 1,
  },
  appealLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  appealHint: {
    fontSize: 13,
    color: 'rgba(191,163,93,0.45)',
    lineHeight: 18,
    marginBottom: 14,
  },
  appealInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    backgroundColor: 'rgba(191,163,93,0.04)',
    padding: 14,
    fontSize: 14,
    color: '#E8DCC8',
    minHeight: 140,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
    color: 'rgba(191,163,93,0.3)',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#8B6914',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(191,163,93,0.5)',
  },
  successBody: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(232,164,78,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: 'rgba(191,163,93,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
