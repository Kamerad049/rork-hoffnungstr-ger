import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Send,
  Check,
  Pencil,
  X,
  ShieldAlert,
  UserCheck,
  Ban,
  Mic,
  Trash2,
  ImagePlus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { ChatInputAreaProps } from './types';
import { useAlert } from '@/providers/AlertProvider';

const WAVE_COUNT = 12;

function ChatInputAreaInner({
  isPartnerBlocked,
  isFriend,
  canSend,
  hasIncomingRequest,
  editingMessage,
  input,
  onInputChange,
  onSend,
  onCancelEdit,
  onAcceptRequest,
  onDeclineRequest,
  onBlockUser,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  isRecording,
  recordingDuration,
  bottomInset,
  recordPulseAnim,
  recordRingAnim,
  recordRing2Anim,
  recordWaveAnims,
  partnerName,
}: ChatInputAreaProps) {
  const { showAlert } = useAlert();
  const micScaleAnim = useRef(new Animated.Value(1)).current;

  const formatRecordingTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMicPressIn = () => {
    Animated.spring(micScaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handleMicPressOut = () => {
    Animated.spring(micScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  if (isPartnerBlocked) {
    return (
      <View style={[styles.blockedBar, { paddingBottom: bottomInset + 6 }]}>
        <Ban size={16} color="#8e8e93" />
        <Text style={styles.blockedText}>Diese Person ist gesperrt</Text>
      </View>
    );
  }

  if (!canSend && !isFriend) {
    return (
      <View style={[styles.blockedBar, { paddingBottom: bottomInset + 6 }]}>
        <Text style={styles.blockedText}>Warte auf Annahme deiner Nachrichtenanfrage</Text>
      </View>
    );
  }

  if (isRecording) {
    const ring1Scale = recordRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.8],
    });
    const ring1Opacity = recordRingAnim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.4, 0.15, 0],
    });
    const ring2Scale = recordRing2Anim ?? recordRingAnim;
    const ring2ScaleInterp = ring2Scale.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.4],
    });
    const ring2Opacity = ring2Scale.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.3, 0.1, 0],
    });

    return (
      <View style={{ paddingBottom: bottomInset + 4 }}>
        <View style={styles.recordingPanel}>
          <View style={styles.recordingTopRow}>
            <Pressable
              onPress={onCancelRecording}
              style={styles.recordCancelBtn}
              testID="cancel-record-btn"
            >
              <Trash2 size={18} color="#C06060" />
            </Pressable>

            <View style={styles.recordingTimerWrap}>
              <View style={styles.recordingDotLive} />
              <Text style={styles.recordingTimerText}>
                {formatRecordingTime(recordingDuration)}
              </Text>
            </View>

            <Pressable
              onPress={onStopRecording}
              style={styles.recordSendBtn}
              testID="stop-record-btn"
            >
              <LinearGradient
                colors={['#D4B96A', '#BFA35D']}
                style={styles.recordSendBtnGradient}
              >
                <Send size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.recordingVisualizerWrap}>
            <View style={styles.circularWaveContainer}>
              <Animated.View
                style={[
                  styles.recordingRing,
                  { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.recordingRing2,
                  { transform: [{ scale: ring2ScaleInterp }], opacity: ring2Opacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.recordingOrb,
                  { transform: [{ scale: recordPulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={['#D4B96A', '#BFA35D', '#A88D45']}
                  style={styles.recordingOrbGradient}
                >
                  <Mic size={26} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </View>

            <View style={styles.circularWaveBars}>
              {recordWaveAnims.map((anim: Animated.Value, i: number) => {
                const angle = (i / WAVE_COUNT) * 360;
                const rad = (angle * Math.PI) / 180;
                const radius = 58;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.circularWaveBar,
                      {
                        transform: [
                          { translateX: x },
                          { translateY: y },
                          { rotate: `${angle + 90}deg` },
                          { scaleY: anim },
                        ],
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <Text style={styles.recordingHint}>Aufnahme läuft...</Text>
        </View>
      </View>
    );
  }

  const hasText = input.trim().length > 0;
  const isEditable = canSend || !!editingMessage;

  return (
    <View style={[styles.inputArea, { paddingBottom: bottomInset + 4 }]}>
      {editingMessage && (
        <View style={styles.editBanner}>
          <Pencil size={13} color="#BFA35D" />
          <View style={styles.editBannerContent}>
            <Text style={styles.editBannerTitle}>Nachricht bearbeiten</Text>
            <Text style={styles.editBannerText} numberOfLines={1}>
              {editingMessage.content}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <X size={16} color="#8e8e93" />
          </Pressable>
        </View>
      )}

      {hasIncomingRequest && (
        <>
          <View style={styles.requestBanner}>
            <ShieldAlert size={18} color="#BFA35D" />
            <View style={styles.requestBannerText}>
              <Text style={styles.requestTitle}>Nachrichtenanfrage</Text>
              <Text style={styles.requestSubtitle}>
                {partnerName ?? 'Diese Person'} ist nicht in deiner Freundesliste. Wenn du annimmst, kann diese Person dir frei Nachrichten senden.
              </Text>
            </View>
          </View>
          <View style={styles.requestActionBar}>
            <Pressable style={styles.requestAcceptBtn} onPress={onAcceptRequest}>
              <UserCheck size={16} color="#FFFFFF" />
              <Text style={styles.requestAcceptBtnText}>Annehmen</Text>
            </Pressable>
            <Pressable style={styles.requestDeclineBtn} onPress={onDeclineRequest}>
              <Text style={styles.requestDeclineBtnText}>Ablehnen</Text>
            </Pressable>
            <Pressable style={styles.requestBlockBtn} onPress={onBlockUser}>
              <Ban size={14} color="#C06060" />
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showAlert('Bild', 'Bildversand kommt bald!');
          }}
          style={({ pressed }) => [
            styles.attachBtn,
            pressed && { opacity: 0.6, transform: [{ scale: 0.9 }] },
          ]}
          testID="image-btn"
        >
          <ImagePlus size={20} color="rgba(191,163,93,0.6)" />
        </Pressable>

        <View style={styles.textInputWrap}>
          <TextInput
            style={styles.textInput}
            placeholder={!isFriend && !canSend ? 'Anfrage ausstehend...' : 'Nachricht...'}
            placeholderTextColor="rgba(142,142,147,0.4)"
            value={input}
            onChangeText={onInputChange}
            maxLength={2000}
            editable={isEditable}
            multiline
            testID="direct-chat-input"
          />
        </View>

        {hasText || editingMessage ? (
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: hasText && isEditable ? '#BFA35D' : 'rgba(60,60,64,0.6)',
                transform: [{ scale: pressed ? 0.88 : 1 }],
              },
            ]}
            onPress={onSend}
            disabled={!hasText || !isEditable}
            testID="direct-send-btn"
          >
            {editingMessage ? (
              <Check size={18} color={hasText ? '#FFFFFF' : '#636366'} />
            ) : (
              <Send size={18} color={hasText && canSend ? '#FFFFFF' : '#636366'} />
            )}
          </Pressable>
        ) : (
          <Animated.View style={{ transform: [{ scale: micScaleAnim }] }}>
            <Pressable
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              onPress={() => {
                if (!canSend) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStartRecording();
              }}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.micBtn,
                !canSend && { opacity: 0.3 },
              ]}
              testID="mic-btn"
            >
              <Mic size={20} color="#BFA35D" />
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default React.memo(ChatInputAreaInner);

const styles = StyleSheet.create({
  inputArea: {
    backgroundColor: '#161618',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(191,163,93,0.1)',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  editBannerContent: {
    flex: 1,
  },
  editBannerTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#BFA35D',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editBannerText: {
    fontSize: 13,
    marginTop: 2,
    color: '#8e8e93',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.06)',
    marginBottom: 1,
  },
  textInputWrap: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#1e1e22',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(191,163,93,0.08)',
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 120,
    color: '#E8DCC8',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191,163,93,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(191,163,93,0.15)',
    marginBottom: 1,
  },
  recordingPanel: {
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.1)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
  },
  recordingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  recordCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192,96,96,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,96,96,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDotLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  recordingTimerText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#E8DCC8',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 1.5,
  },
  recordSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  recordSendBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  recordingVisualizerWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  circularWaveContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingRing: {
    position: 'absolute' as const,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(191,163,93,0.3)',
  },
  recordingRing2: {
    position: 'absolute' as const,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.2)',
  },
  recordingOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  recordingOrbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  circularWaveBars: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularWaveBar: {
    position: 'absolute' as const,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: 'rgba(191,163,93,0.4)',
  },
  recordingHint: {
    fontSize: 11,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 0.3,
  },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  blockedText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#8e8e93',
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: 'rgba(191,163,93,0.03)',
  },
  requestBannerText: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
    color: '#E8DCC8',
  },
  requestSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8e8e93',
  },
  requestActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191,163,93,0.06)',
    backgroundColor: '#161618',
  },
  requestAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#BFA35D',
  },
  requestAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  requestDeclineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  requestDeclineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8e8e93',
  },
  requestBlockBtn: {
    padding: 9,
    marginLeft: 'auto',
  },
});
