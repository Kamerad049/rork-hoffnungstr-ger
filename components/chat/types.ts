import type { ChatMessage } from '@/constants/types';

export type InputMode = 'image' | 'text' | 'audio';

export interface ChatHeaderProps {
  partnerName: string;
  isFriend: boolean;
  onBack: () => void;
  topInset: number;
}

export interface ChatMessageItemProps {
  item: ChatMessage;
  activeMenuId: string | null;
  tertiaryTextColor: string;
  onToggleMenu: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onRecall: (msg: ChatMessage) => void;
}

export interface ChatInputAreaProps {
  partnerId: string;
  isPartnerBlocked: boolean;
  isFriend: boolean;
  canSend: boolean;
  isRequest: boolean;
  hasIncomingRequest: boolean;
  editingMessage: ChatMessage | null;
  input: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onCancelEdit: () => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
  onBlockUser: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  isRecording: boolean;
  recordingDuration: number;
  inputMode: InputMode;
  onSwitchMode: (mode: InputMode) => void;
  bottomInset: number;
  recordPulseAnim: any;
  recordRingAnim: any;
  recordRing2Anim: any;
  recordGlowAnim: any;
  wheelSlideAnim: any;
  recordWaveAnims: any[];
  partnerName?: string;
}
