import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { X, ShieldAlert, ChevronRight, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MODERATION_REASONS } from '@/constants/types';
import type { FeedPost } from '@/constants/types';

interface AdminDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
  onConfirm: (post: FeedPost, reason: string, details: string) => void;
}

type Step = 'reason' | 'details' | 'confirm';

function AdminDeleteModalInner({ visible, onClose, post, onConfirm }: AdminDeleteModalProps) {
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');


  const reset = useCallback(() => {
    setStep('reason');
    setSelectedReason('');
    setDetails('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSelectReason = useCallback((reason: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(reason);
    setStep('details');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!post || !selectedReason) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm(post, selectedReason, details.trim());
    handleClose();
  }, [post, selectedReason, details, onConfirm, handleClose]);

  const handleBack = useCallback(() => {
    if (step === 'details') setStep('reason');
    if (step === 'confirm') setStep('details');
  }, [step]);

  const reasonConfig = MODERATION_REASONS.find((r) => r.key === selectedReason);

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
            {step !== 'reason' ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <Text style={styles.backText}>Zurück</Text>
              </Pressable>
            ) : (
              <View style={{ width: 50 }} />
            )}
            <Text style={styles.sheetTitle}>Beitrag entfernen</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={22} color="rgba(191,163,93,0.5)" />
            </Pressable>
          </View>

          {step === 'reason' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.warningBox}>
                <ShieldAlert size={18} color="#E8A44E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Admin-Moderation</Text>
                  <Text style={styles.warningText}>
                    Der Beitrag wird entfernt und der Nutzer benachrichtigt. Er kann Widerspruch einlegen.
                  </Text>
                </View>
              </View>

              {MODERATION_REASONS.map((reason) => (
                <Pressable
                  key={reason.key}
                  style={styles.reasonItem}
                  onPress={() => handleSelectReason(reason.key)}
                  testID={`admin-reason-${reason.key}`}
                >
                  <Text style={styles.reasonIcon}>{reason.icon}</Text>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                  <ChevronRight size={16} color="rgba(191,163,93,0.3)" />
                </Pressable>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {step === 'details' && (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.selectedReasonBadge}>
                <Text style={styles.selectedReasonText}>
                  {reasonConfig?.icon} {reasonConfig?.label}
                </Text>
              </View>

              <Text style={styles.detailsLabel}>Begründung für den Nutzer</Text>
              <Text style={styles.detailsHint}>
                Diese Nachricht erhält der Nutzer zusammen mit der Benachrichtigung über die Entfernung.
              </Text>
              <TextInput
                style={styles.detailsInput}
                placeholder="Erläutere den Grund genauer (optional, aber empfohlen)..."
                placeholderTextColor="rgba(191,163,93,0.3)"
                multiline
                numberOfLines={4}
                maxLength={500}
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{details.length}/500</Text>

              <View style={styles.summaryBox}>
                <AlertTriangle size={16} color="#C06060" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>Zusammenfassung</Text>
                  <Text style={styles.summaryText}>
                    Grund: {reasonConfig?.label}{'\n'}
                    {details.trim() ? `Details: ${details.trim().slice(0, 80)}${details.length > 80 ? '...' : ''}` : 'Keine zusätzlichen Details'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirm}
                testID="admin-delete-confirm"
              >
                <ShieldAlert size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Beitrag entfernen</Text>
              </Pressable>

              <Text style={styles.disclaimer}>
                Der Beitrag wird als Snapshot gespeichert und kann bei erfolgreicher Berufung wiederhergestellt werden.
              </Text>

              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default React.memo(AdminDeleteModalInner);

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
    maxHeight: '85%',
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
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#E8DCC8',
  },
  backText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(232,164,78,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,164,78,0.15)',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#E8A44E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 18,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(191,163,93,0.04)',
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  reasonIcon: {
    fontSize: 18,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E8DCC8',
  },
  selectedReasonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(191,163,93,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
    marginBottom: 20,
  },
  selectedReasonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#BFA35D',
  },
  detailsLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    marginBottom: 4,
  },
  detailsHint: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.4)',
    marginBottom: 10,
    lineHeight: 16,
  },
  detailsInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    backgroundColor: 'rgba(191,163,93,0.04)',
    padding: 14,
    fontSize: 14,
    color: '#E8DCC8',
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
    color: 'rgba(191,163,93,0.3)',
  },
  summaryBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(192,96,96,0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.12)',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#C06060',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: 'rgba(232,220,200,0.6)',
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#8B0000',
    marginBottom: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    color: 'rgba(191,163,93,0.35)',
  },
});
