import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Check,
  CheckCheck,
  Pencil,
  Undo2,
  Camera,
} from 'lucide-react-native';
import { formatTimeAgo } from '@/lib/utils';
import VoiceMessageBubble from '@/components/VoiceMessageBubble';
import type { ChatMessageItemProps } from './types';

function ChatMessageItemInner({
  item,
  activeMenuId,
  tertiaryTextColor,
  onToggleMenu,
  onEdit,
  onRecall,
}: ChatMessageItemProps) {
  const isMe = item.fromUserId === 'me';
  const canModify = isMe && !item.read && !item.recalled;
  const isMenuOpen = activeMenuId === item.id;

  if (item.isSystem) {
    return (
      <View style={styles.systemMsgRow}>
        <View style={styles.systemMsgBubble}>
          <Camera size={12} color="#E53935" />
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
        <Text style={[styles.systemMsgTime, { color: tertiaryTextColor }]}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
    );
  }

  if (item.recalled) {
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        <View style={styles.recalledBubble}>
          <Undo2 size={12} color="rgba(142,142,147,0.5)" />
          <Text style={styles.recalledText}>Nachricht zurückgezogen</Text>
        </View>
      </View>
    );
  }

  if (item.isVoice && item.voiceUri) {
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        <Pressable
          onPress={() => onToggleMenu(item)}
          onLongPress={() => onToggleMenu(item)}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.voiceBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            pressed && { opacity: 0.85 },
          ]}
        >
          <VoiceMessageBubble
            voiceUri={item.voiceUri}
            duration={item.voiceDuration ?? 0}
            isMe={isMe}
          />
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.55)' : 'rgba(191,163,93,0.45)' }]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
            {isMe && (
              <View style={styles.readIndicator}>
                {item.read ? (
                  <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
                ) : (
                  <Check size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                )}
              </View>
            )}
          </View>
        </Pressable>

        {isMenuOpen && canModify && (
          <View style={[styles.inlineMenu, isMe ? styles.inlineMenuMe : styles.inlineMenuOther]}>
            <Pressable style={styles.inlineMenuBtn} onPress={() => onRecall(item)}>
              <Undo2 size={13} color="#C06060" />
              <Text style={[styles.inlineMenuText, { color: '#C06060' }]}>Zurückziehen</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
      <Pressable
        onPress={() => onToggleMenu(item)}
        onLongPress={() => onToggleMenu(item)}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.msgBubble,
          isMe ? styles.bubbleMe : styles.bubbleOther,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : '#E8DCC8' }]}>
          {item.content}
        </Text>
        <View style={styles.msgFooter}>
          {item.edited && (
            <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.45)' : 'rgba(191,163,93,0.4)' }]}>
              bearbeitet
            </Text>
          )}
          <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.55)' : 'rgba(191,163,93,0.45)' }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
          {isMe && (
            <View style={styles.readIndicator}>
              {item.read ? (
                <CheckCheck size={14} color="#34B7F1" strokeWidth={2.5} />
              ) : (
                <Check size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
              )}
            </View>
          )}
        </View>
      </Pressable>

      {isMenuOpen && canModify && (
        <View style={[styles.inlineMenu, isMe ? styles.inlineMenuMe : styles.inlineMenuOther]}>
          <Pressable style={styles.inlineMenuBtn} onPress={() => onEdit(item)}>
            <Pencil size={13} color="#BFA35D" />
            <Text style={[styles.inlineMenuText, { color: '#BFA35D' }]}>Bearbeiten</Text>
          </Pressable>
          <Pressable style={styles.inlineMenuBtn} onPress={() => onRecall(item)}>
            <Undo2 size={13} color="#C06060" />
            <Text style={[styles.inlineMenuText, { color: '#C06060' }]}>Zurückziehen</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default React.memo(ChatMessageItemInner);

const styles = StyleSheet.create({
  msgRow: {
    marginBottom: 8,
  },
  msgRowMe: {
    alignItems: 'flex-end',
  },
  msgRowOther: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voiceBubble: {
    maxWidth: '80%',
    minWidth: 210,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#BFA35D',
    borderBottomRightRadius: 6,
    shadowColor: '#BFA35D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleOther: {
    backgroundColor: '#222226',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.06)',
  },
  recalledBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(142,142,147,0.12)',
    borderStyle: 'dashed' as const,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recalledText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    color: 'rgba(142,142,147,0.5)',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic' as const,
  },
  msgTime: {
    fontSize: 10,
  },
  readIndicator: {
    marginLeft: 1,
  },
  inlineMenu: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  inlineMenuMe: {
    justifyContent: 'flex-end',
  },
  inlineMenuOther: {
    justifyContent: 'flex-start',
  },
  inlineMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1e1e22',
    borderWidth: 1,
    borderColor: 'rgba(191,163,93,0.08)',
  },
  inlineMenuText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  systemMsgRow: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  systemMsgBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(229,57,53,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.12)',
  },
  systemMsgText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#E53935',
    flexShrink: 1,
  },
  systemMsgTime: {
    fontSize: 10,
    marginTop: 3,
  },
});
