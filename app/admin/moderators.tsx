import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  Trash2,
  Settings,
  ChevronRight,
  X,
  Crown,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import {
  useModeration,
  type Moderator,
  type ModeratorRole,
  type ModeratorPermissions,
  DEFAULT_PERMISSIONS,
  HAUPTADMIN_ID,
} from '@/providers/ModerationProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getUserById } from '@/lib/utils';
import type { SocialUser } from '@/constants/types';
import * as Haptics from 'expo-haptics';

export default function AdminModeratorsScreen() {
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  const {
    moderators,
    availableUsers,
    addModerator,
    updateModeratorPermissions,
    removeModerator,
    canManageRole,
    isHauptadmin,
  } = useModeration();

  const currentUserId = authUser?.id ?? HAUPTADMIN_ID;
  const isCurrentUserHauptadmin = currentUserId === HAUPTADMIN_ID;

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedMod, setSelectedMod] = useState<Moderator | null>(null);
  const [selectedRole, setSelectedRole] = useState<ModeratorRole>('moderator');

  const handleAddModerator = useCallback((user: SocialUser, role: ModeratorRole) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addModerator(user.id, role, 'admin');
    setShowAddModal(false);
  }, [addModerator]);

  const handleRemoveModerator = useCallback((userId: string) => {
    if (isHauptadmin(userId)) {
      Alert.alert('Nicht möglich', 'Der Hauptadmin kann nicht entfernt werden.');
      return;
    }
    const targetMod = moderators.find((m) => m.userId === userId);
    if (!isCurrentUserHauptadmin && targetMod?.role === 'admin') {
      Alert.alert('Nicht möglich', 'Du kannst keine anderen Admins entfernen. Nur der Hauptadmin hat diese Berechtigung.');
      return;
    }
    const user = getUserById(userId);
    Alert.alert(
      'Moderator entfernen',
      `Möchtest du ${user?.displayName ?? 'diesen Nutzer'} als Moderator entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeModerator(userId, currentUserId);
          },
        },
      ]
    );
  }, [removeModerator, isHauptadmin, moderators, isCurrentUserHauptadmin, currentUserId]);

  const handleTogglePermission = useCallback((userId: string, key: keyof ModeratorPermissions, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateModeratorPermissions(userId, { [key]: value });
  }, [updateModeratorPermissions]);

  const handleEditMod = useCallback((mod: Moderator) => {
    setSelectedMod(mod);
    setShowEditModal(true);
  }, []);

  const handleChangeRole = useCallback((mod: Moderator, newRole: ModeratorRole) => {
    if (isHauptadmin(mod.userId)) {
      Alert.alert('Nicht möglich', 'Die Rolle des Hauptadmins kann nicht geändert werden.');
      return;
    }
    if (!isCurrentUserHauptadmin && newRole === 'admin') {
      Alert.alert('Nicht möglich', 'Nur der Hauptadmin kann jemanden zum Admin ernennen.');
      return;
    }
    if (!isCurrentUserHauptadmin && mod.role === 'admin') {
      Alert.alert('Nicht möglich', 'Du kannst die Rolle eines Admins nicht ändern.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addModerator(mod.userId, newRole, currentUserId);
    setSelectedMod((prev) => prev ? { ...prev, role: newRole, permissions: { ...DEFAULT_PERMISSIONS[newRole] } } : null);
  }, [addModerator, isHauptadmin, isCurrentUserHauptadmin, currentUserId]);

  const getRoleColor = useCallback((role: ModeratorRole) => {
    if (role === 'admin') return '#C62828';
    return role === 'super_moderator' ? '#E8A44E' : '#5B9BD5';
  }, []);

  const getRoleLabel = useCallback((role: ModeratorRole) => {
    if (role === 'admin') return 'Admin';
    return role === 'super_moderator' ? 'Super Moderator' : 'Moderator';
  }, []);

  const getRoleIcon = useCallback((role: ModeratorRole) => {
    if (role === 'admin') return <Crown size={20} color="#C62828" />;
    return role === 'super_moderator'
      ? <ShieldCheck size={20} color="#E8A44E" />
      : <Shield size={20} color="#5B9BD5" />;
  }, []);

  const permissionLabels: { key: keyof ModeratorPermissions; label: string; description: string }[] = [
    { key: 'viewReports', label: 'Meldungen einsehen', description: 'Kann alle gemeldeten Inhalte sehen' },
    { key: 'resolveReports', label: 'Meldungen bearbeiten', description: 'Kann Meldungen erledigen/ablehnen' },
    { key: 'editPosts', label: 'Beiträge bearbeiten', description: 'Kann Beiträge anderer Nutzer bearbeiten' },
    { key: 'deletePosts', label: 'Beiträge löschen', description: 'Kann Beiträge anderer Nutzer löschen' },
    { key: 'deleteStories', label: 'Storys löschen', description: 'Kann Storys anderer Nutzer löschen' },
    { key: 'banUsers', label: 'Nutzer sperren', description: 'Kann Nutzer temporär/dauerhaft sperren' },
  ];

  const renderModerator = useCallback(({ item }: { item: Moderator }) => {
    const user = getUserById(item.userId);
    if (!user) return null;
    const roleColor = getRoleColor(item.role);

    return (
      <Pressable
        style={[styles.modCard, { backgroundColor: colors.surface }]}
        onPress={() => handleEditMod(item)}
        testID={`mod-card-${item.userId}`}
      >
        <View style={[styles.modAvatar, { backgroundColor: `${roleColor}20` }]}>
          <Text style={[styles.modAvatarText, { color: roleColor }]}>
            {user.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.modInfo}>
          <Text style={[styles.modName, { color: colors.primaryText }]}>{user.displayName}</Text>
          <Text style={[styles.modUsername, { color: colors.tertiaryText }]}>@{user.username}</Text>
        </View>
        <View style={styles.modRoleWrap}>
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
            {getRoleIcon(item.role)}
            <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(item.role)}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.tertiaryText} />
      </Pressable>
    );
  }, [colors, getRoleColor, getRoleIcon, getRoleLabel, handleEditMod]);

  const renderAvailableUser = useCallback(({ item }: { item: SocialUser }) => (
    <View style={[styles.userCard, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={[styles.userAvatar, { backgroundColor: colors.accentLight }]}>
        <Text style={[styles.userAvatarText, { color: colors.accent }]}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.primaryText }]}>{item.displayName}</Text>
        <Text style={[styles.userUsername, { color: colors.tertiaryText }]}>@{item.username}</Text>
      </View>
      <View style={styles.addBtns}>
        <Pressable
          style={[styles.addRoleBtn, { backgroundColor: '#5B9BD520' }]}
          onPress={() => handleAddModerator(item, 'moderator')}
        >
          <Shield size={14} color="#5B9BD5" />
          <Text style={[styles.addRoleBtnText, { color: '#5B9BD5' }]}>Mod</Text>
        </Pressable>
        <Pressable
          style={[styles.addRoleBtn, { backgroundColor: '#E8A44E20' }]}
          onPress={() => handleAddModerator(item, 'super_moderator')}
        >
          <ShieldCheck size={14} color="#E8A44E" />
          <Text style={[styles.addRoleBtnText, { color: '#E8A44E' }]}>Super</Text>
        </Pressable>
        {isCurrentUserHauptadmin && (
          <Pressable
            style={[styles.addRoleBtn, { backgroundColor: '#C6282820' }]}
            onPress={() => handleAddModerator(item, 'admin')}
          >
            <Crown size={14} color="#C62828" />
            <Text style={[styles.addRoleBtnText, { color: '#C62828' }]}>Admin</Text>
          </Pressable>
        )}
      </View>
    </View>
  ), [colors, handleAddModerator]);

  return (
    <View style={[styles.container, { backgroundColor: '#141416' }]}>
      <View style={[styles.headerCard, { backgroundColor: '#1e1e20', borderColor: 'rgba(191,163,93,0.06)', borderWidth: 1 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Moderatoren</Text>
            <Text style={[styles.headerSub, { color: colors.tertiaryText }]}>{moderators.length} ernannt</Text>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowAddModal(true)}
            testID="add-moderator-btn"
          >
            <UserPlus size={18} color="#1c1c1e" />
            <Text style={styles.addBtnText}>Hinzufügen</Text>
          </Pressable>
        </View>

        <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
          <View style={styles.legendItem}>
            <Shield size={14} color="#5B9BD5" />
            <Text style={[styles.legendText, { color: colors.tertiaryText }]}>Moderator – eingeschränkte Rechte</Text>
          </View>
          <View style={styles.legendItem}>
            <ShieldCheck size={14} color="#E8A44E" />
            <Text style={[styles.legendText, { color: colors.tertiaryText }]}>Super Moderator – erweiterte Rechte</Text>
          </View>
          <View style={styles.legendItem}>
            <Crown size={14} color="#C62828" />
            <Text style={[styles.legendText, { color: colors.tertiaryText }]}>Admin – volle Rechte (außer Hauptadmin)</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={moderators}
        keyExtractor={(item) => item.userId}
        renderItem={renderModerator}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Shield size={48} color={colors.tertiaryText} />
            <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>Keine Moderatoren</Text>
            <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
              Ernenne Nutzer zu Moderatoren um die Community zu verwalten.
            </Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Moderator ernennen</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={12}>
                <X size={22} color={colors.tertiaryText} />
              </Pressable>
            </View>
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderAvailableUser}
              contentContainerStyle={styles.addList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>Alle Nutzer sind bereits Moderatoren</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal && !!selectedMod}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            {selectedMod && (() => {
              const user = getUserById(selectedMod.userId);
              const currentMod = moderators.find((m) => m.userId === selectedMod.userId) ?? selectedMod;
              if (!user) return null;

              return (
                <ScrollView style={styles.editBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.editHeader}>
                    <View style={[styles.editAvatar, { backgroundColor: `${getRoleColor(currentMod.role)}20` }]}>
                      <Text style={[styles.editAvatarText, { color: getRoleColor(currentMod.role) }]}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.editName, { color: colors.primaryText }]}>{user.displayName}</Text>
                    <Text style={[styles.editUsername, { color: colors.tertiaryText }]}>@{user.username}</Text>
                  </View>

                  <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Rolle</Text>
                  <View style={styles.roleSelectorWrap}>
                    <View style={styles.roleSelector}>
                      <Pressable
                        style={[
                          styles.roleOption,
                          { backgroundColor: colors.surfaceSecondary },
                          currentMod.role === 'moderator' && { borderColor: '#5B9BD5', borderWidth: 2 },
                        ]}
                        onPress={() => handleChangeRole(currentMod, 'moderator')}
                      >
                        <Shield size={22} color="#5B9BD5" />
                        <Text style={[styles.roleOptionLabel, { color: colors.primaryText }]}>Moderator</Text>
                        <Text style={[styles.roleOptionDesc, { color: colors.tertiaryText }]}>Grundlegende Moderationsrechte</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.roleOption,
                          { backgroundColor: colors.surfaceSecondary },
                          currentMod.role === 'super_moderator' && { borderColor: '#E8A44E', borderWidth: 2 },
                        ]}
                        onPress={() => handleChangeRole(currentMod, 'super_moderator')}
                      >
                        <ShieldCheck size={22} color="#E8A44E" />
                        <Text style={[styles.roleOptionLabel, { color: colors.primaryText }]}>Super Mod</Text>
                        <Text style={[styles.roleOptionDesc, { color: colors.tertiaryText }]}>Erweiterte Rechte inkl. Löschen</Text>
                      </Pressable>
                    </View>
                    {isCurrentUserHauptadmin && (
                      <Pressable
                        style={[
                          styles.adminRoleOption,
                          { backgroundColor: colors.surfaceSecondary },
                          currentMod.role === 'admin' && { borderColor: '#C62828', borderWidth: 2 },
                        ]}
                        onPress={() => handleChangeRole(currentMod, 'admin')}
                      >
                        <Crown size={22} color="#C62828" />
                        <View style={styles.adminRoleTextWrap}>
                          <Text style={[styles.roleOptionLabel, { color: colors.primaryText }]}>Admin</Text>
                          <Text style={[styles.roleOptionDesc, { color: colors.tertiaryText }]}>Volle Rechte – kann Moderatoren & Super Moderatoren verwalten</Text>
                        </View>
                      </Pressable>
                    )}
                  </View>

                  <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Berechtigungen</Text>
                  {permissionLabels.map((perm) => (
                    <View key={perm.key} style={[styles.permRow, { backgroundColor: colors.surfaceSecondary }]}>
                      <View style={styles.permInfo}>
                        <Text style={[styles.permLabel, { color: colors.primaryText }]}>{perm.label}</Text>
                        <Text style={[styles.permDesc, { color: colors.tertiaryText }]}>{perm.description}</Text>
                      </View>
                      <Switch
                        value={currentMod.permissions[perm.key]}
                        onValueChange={(val) => handleTogglePermission(currentMod.userId, perm.key, val)}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}

                  {(isCurrentUserHauptadmin || currentMod.role !== 'admin') && (
                    <Pressable
                      style={[styles.removeBtn, { borderColor: colors.red }]}
                      onPress={() => {
                        setShowEditModal(false);
                        handleRemoveModerator(currentMod.userId);
                      }}
                    >
                      <Trash2 size={16} color={colors.red} />
                      <Text style={[styles.removeBtnText, { color: colors.red }]}>
                        {currentMod.role === 'admin' ? 'Admin entfernen' : 'Moderator entfernen'}
                      </Text>
                    </Pressable>
                  )}

                  <View style={{ height: 30 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    margin: 16,
    borderRadius: 16,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1c1c1e',
  },
  legendRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  modCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  modAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modAvatarText: {
    fontSize: 19,
    fontWeight: '700' as const,
  },
  modInfo: {
    flex: 1,
  },
  modName: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  modUsername: {
    fontSize: 12,
  },
  modRoleWrap: {
    marginRight: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 1,
  },
  userUsername: {
    fontSize: 12,
  },
  addBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  addRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addRoleBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  editBody: {
    paddingHorizontal: 20,
  },
  editHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  editAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  editAvatarText: {
    fontSize: 26,
    fontWeight: '700' as const,
  },
  editName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  editUsername: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
    marginTop: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectorWrap: {
    gap: 8,
    marginBottom: 18,
  },
  roleOption: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  adminRoleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  adminRoleTextWrap: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  roleOptionDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  permInfo: {
    flex: 1,
    marginRight: 12,
  },
  permLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  permDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  removeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
