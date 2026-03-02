import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
  Alert,
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
  Type,
  ImagePlus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { ChatInputAreaProps, InputMode } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVE_COUNT = 12;

const MODES: { key: InputMode; label: string }[] = [
  { key: 'image', label: 'Bild' },
  { key: 'text', label: 'Text' },
  { key: 'audio', label: 'Ton' },
];

function getModeIcon(modeKey: InputMode, isActive: boolean) {
  const color = isActive ? '#1a1a1a' : 'rgba(191,163,93,0.45)';
  const size = 15;
  switch (modeKey) {
    case 'image': return <ImagePlus size={size} color={color} strokeWidth={2.2} />;
    case 'text': return <Type size={size} color={color} strokeWidth={2.2} />;
    case 'audio': return <Mic size={size} color={color} strokeWidth={2.2} />;
  }
}

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
  inputMode,
  onSwitchMode,
  bottomInset,
  recordPulseAnim,
  recordRingAnim,
  recordRing2Anim,
  wheelSlideAnim,
  recordWaveAnims,
  partnerName,
}: ChatInputAreaProps) {
  const wheelWidth = SCREEN_WIDTH - 32;
  const segmentWidth = (wheelWidth - 8) / 3;
  const wheelIndicatorLeft = wheelSlideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [4, 4 + segmentWidth, 4 + segmentWidth * 2],
  });

  const formatRecordingTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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

      <View style={styles.commandWheelWrap}>
        <View style={[styles.commandWheel, { width: wheelWidth }]}>
          <View style={styles.commandWheelTrack}>
            <View style={styles.commandWheelNotches}>
              {[...Array(14)].map((_, i) => (
                <View key={i} style={styles.commandWheelNotch} />
              ))}
            </View>
          </View>

          <Animated.View
            style={[
              styles.commandWheelIndicator,
              {
                width: segmentWidth,
                left: wheelIndicatorLeft,
              },
            ]}
          >
            <LinearGradient
              colors={['#D4B96A', '#BFA35D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.commandWheelIndicatorGradient}
            />
          </Animated.View>

          {MODES.map((mode) => {
            const isActive = inputMode === mode.key;
            return (
              <Pressable
                key={mode.key}
                onPress={() => onSwitchMode(mode.key)}
                style={[styles.commandWheelBtn, { width: segmentWidth }]}
                testID={`mode-${mode.key}-btn`}
              >
                {getModeIcon(mode.key, isActive)}
                <Text
                  style={[
                    styles.commandWheelLabel,
                    { color: isActive ? '#1a1a1a' : 'rgba(191,163,93,0.45)' },
                    isActive && styles.commandWheelLabelActive,
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {inputMode === 'text' ? (
        <View style={styles.textInputRow}>
          <TextInput
            style={styles.textInput}
            placeholder={!isFriend && !canSend ? 'Anfrage ausstehend...' : 'Nachricht schreiben...'}
            placeholderTextColor="rgba(142,142,147,0.5)"
            value={input}
            onChangeText={onInputChange}
            maxLength={2000}
            editable={canSend || !!editingMessage}
            multiline
            testID="direct-chat-input"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && (canSend || editingMessage) ? '#BFA35D' : 'rgba(60,60,64,0.6)',
                transform: [{ scale: pressed ? 0.9 : 1 }],
              },
            ]}
            onPress={onSend}
            disabled={!input.trim() || (!canSend && !editingMessage)}
            testID="direct-send-btn"
          >
            {editingMessage ? (
              <Check size={18} color={input.trim() ? '#FFFFFF' : '#636366'} />
            ) : (
              <Send size={18} color={input.trim() && canSend ? '#FFFFFF' : '#636366'} />
            )}
          </Pressable>
        </View>
      ) : inputMode === 'audio' ? (
        <View style={styles.audioInputRow}>
          <Pressable
            onPress={onStartRecording}
            style={({ pressed }) => [
              styles.audioRecordBtn,
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
            testID="mic-btn"
          >
            <LinearGradient
              colors={['#D4B96A', '#BFA35D', '#A88D45']}
              style={styles.audioRecordBtnInner}
            >
              <Mic size={24} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Text style={styles.audioReadyText}>Tippe zum Aufnehmen</Text>
        </View>
      ) : (
        <View style={styles.imageInputRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Bild', 'Bildversand kommt bald!');
            }}
            style={({ pressed }) => [
              styles.imagePickBtn,
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
            testID="image-btn"
          >
            <LinearGradient
              colors={['#D4B96A', '#BFA35D', '#A88D45']}
              style={styles.imagePickBtnInner}
            >
              <ImagePlus size={24} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Text style={styles.audioReadyText}>Bild senden</Text>
        </View>
      )}
    </View>
  );
}

export default React.memo(ChatInputAreaInner);

const styles = StyleSheet.create({
  inputArea: {
    backgroundColor: '#161618',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,163,93,0.06)',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
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
  commandWheelWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  commandWheel: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1e',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative' as const,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  commandWheelTrack: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  commandWheelNotches: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  commandWheelNotch: {
    width: 1,
    height: 8,
    backgroundColor: 'rgba(191,163,93,0.06)',
    borderRadius: 1,
  },
  commandWheelIndicator: {
    position: 'absolute' as const,
    top: 3,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  commandWheelIndicatorGradient: {
    flex: 1,
    borderRadius: 18,
  },
  commandWheelBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 2,
  },
  commandWheelLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  commandWheelLabelActive: {
    fontWeight: '700' as const,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1e1e22',
    color: '#E8DCC8',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInputRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  imageInputRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  imagePickBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  imagePickBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  audioReadyText: {
    fontSize: 12,
    color: 'rgba(191,163,93,0.35)',
    letterSpacing: 0.3,
  },
  audioRecordBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(191,163,93,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(191,163,93,0.15)',
  },
  audioRecordBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
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
