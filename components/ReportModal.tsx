import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Flag, ChevronRight, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useModeration, REPORT_REASONS, type ReportReason, type ContentType } from '@/providers/ModerationProvider';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: string;
  contentPreview: string;
  reportedUserId: string;
}

type Step = 'reason' | 'details' | 'success';

function ReportModalInner({ visible, onClose, contentType, contentId, contentPreview, reportedUserId }: ReportModalProps) {
  const { colors } = useTheme();
  const { submitReport } = useModeration();
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const contentLabel = contentType === 'post' ? 'Beitrag' : contentType === 'story' ? 'Story' : 'Kommentar';

  const reset = useCallback(() => {
    setStep('reason');
    setSelectedReason(null);
    setDetails('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSelectReason = useCallback((reason: ReportReason) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(reason);
    setStep('details');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitReport({
      contentType,
      contentId,
      contentPreview: contentPreview.slice(0, 120),
      reportedUserId,
      reporterUserId: 'me',
      reason: selectedReason,
      details: details.trim(),
    });
    setStep('success');
    setTimeout(() => {
      handleClose();
    }, 1800);
  }, [selectedReason, details, contentType, contentId, contentPreview, reportedUserId, submitReport, handleClose]);

  const handleBack = useCallback(() => {
    if (step === 'details') {
      setStep('reason');
    }
  }, [step]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            {step === 'details' ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <Text style={[styles.backText, { color: colors.accent }]}>Zurück</Text>
              </Pressable>
            ) : (
              <View style={{ width: 50 }} />
            )}
            <Text style={[styles.sheetTitle, { color: colors.primaryText }]}>
              {step === 'success' ? 'Gemeldet' : `${contentLabel} melden`}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={22} color={colors.tertiaryText} />
            </Pressable>
          </View>

          {step === 'reason' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={[styles.infoBox, { backgroundColor: colors.accentLight }]}>
                <Flag size={16} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.secondaryText }]}>
                  Warum möchtest du diesen {contentLabel} melden?
                </Text>
              </View>

              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason.key}
                  style={[styles.reasonItem, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => handleSelectReason(reason.key)}
                  testID={`report-reason-${reason.key}`}
                >
                  <Text style={styles.reasonIcon}>{reason.icon}</Text>
                  <Text style={[styles.reasonLabel, { color: colors.primaryText }]}>{reason.label}</Text>
                  <ChevronRight size={18} color={colors.tertiaryText} />
                </Pressable>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {step === 'details' && (
            <View style={styles.body}>
              <View style={[styles.selectedReasonBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.selectedReasonText, { color: colors.accent }]}>
                  {REPORT_REASONS.find((r) => r.key === selectedReason)?.icon}{' '}
                  {REPORT_REASONS.find((r) => r.key === selectedReason)?.label}
                </Text>
              </View>

              <Text style={[styles.detailsLabel, { color: colors.primaryText }]}>
                Zusätzliche Details (optional)
              </Text>
              <TextInput
                style={[styles.detailsInput, { backgroundColor: colors.surfaceSecondary, color: colors.primaryText, borderColor: colors.border }]}
                placeholder="Beschreibe das Problem genauer..."
                placeholderTextColor={colors.tertiaryText}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.tertiaryText }]}>{details.length}/500</Text>

              <Pressable
                style={[styles.submitBtn, { backgroundColor: '#C06060' }]}
                onPress={handleSubmit}
                testID="report-submit"
              >
                <Flag size={18} color="#fff" />
                <Text style={styles.submitText}>{contentLabel} melden</Text>
              </Pressable>

              <Text style={[styles.disclaimer, { color: colors.tertiaryText }]}>
                Deine Meldung wird von unserem Team geprüft. Falsche Meldungen können Konsequenzen haben.
              </Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.successBody}>
              <View style={[styles.successIcon, { backgroundColor: 'rgba(80,180,80,0.12)' }]}>
                <CheckCircle size={48} color="#50B450" />
              </View>
              <Text style={[styles.successTitle, { color: colors.primaryText }]}>
                Meldung eingereicht
              </Text>
              <Text style={[styles.successSub, { color: colors.tertiaryText }]}>
                Vielen Dank! Wir werden den {contentLabel} schnellstmöglich prüfen.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default React.memo(ReportModalInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  body: {
    paddingHorizontal: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  reasonIcon: {
    fontSize: 20,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  selectedReasonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  selectedReasonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailsLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  detailsInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  successBody: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
