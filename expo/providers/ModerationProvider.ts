import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { SocialUser, FeedPost, ModerationAction, ModerationAppeal, ModerationActionStatus, AppealStatus } from '@/constants/types';

const STORAGE_KEY_REMOVED_POSTS = 'admin_removed_post_ids';

export const HAUPTADMIN_ID = 'admin';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'copyright'
  | 'other';

export const REPORT_REASONS: { key: ReportReason; label: string; icon: string }[] = [
  { key: 'spam', label: 'Spam', icon: '🚫' },
  { key: 'harassment', label: 'Belästigung', icon: '😤' },
  { key: 'hate_speech', label: 'Hassrede', icon: '🗯️' },
  { key: 'violence', label: 'Gewalt', icon: '⚠️' },
  { key: 'nudity', label: 'Nacktheit / Sexuell', icon: '🔞' },
  { key: 'misinformation', label: 'Falschinformation', icon: '📰' },
  { key: 'copyright', label: 'Urheberrechtsverletzung', icon: '©️' },
  { key: 'other', label: 'Sonstiges', icon: '📋' },
];

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ContentType = 'post' | 'story' | 'comment' | 'reel' | 'reel_comment';

export interface Report {
  id: string;
  contentType: ContentType;
  contentId: string;
  contentPreview: string;
  reportedUserId: string;
  reporterUserId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
}

export type UserRestrictionType = 'comment_ban' | 'post_ban' | 'like_ban' | 'full_ban';

export interface UserRestriction {
  userId: string;
  type: UserRestrictionType;
  reason: string;
  startedAt: string;
  expiresAt: string;
  issuedBy: string;
  violationCount: number;
}

export interface SpamEntry {
  userId: string;
  content: string;
  timestamp: string;
}

export type ModeratorRole = 'moderator' | 'super_moderator' | 'admin';

export interface ModeratorPermissions {
  viewReports: boolean;
  resolveReports: boolean;
  editPosts: boolean;
  deletePosts: boolean;
  deleteStories: boolean;
  banUsers: boolean;
}

export const DEFAULT_PERMISSIONS: Record<ModeratorRole, ModeratorPermissions> = {
  moderator: {
    viewReports: true,
    resolveReports: false,
    editPosts: false,
    deletePosts: false,
    deleteStories: false,
    banUsers: false,
  },
  super_moderator: {
    viewReports: true,
    resolveReports: true,
    editPosts: true,
    deletePosts: true,
    deleteStories: true,
    banUsers: false,
  },
  admin: {
    viewReports: true,
    resolveReports: true,
    editPosts: true,
    deletePosts: true,
    deleteStories: true,
    banUsers: true,
  },
};

export interface Moderator {
  userId: string;
  role: ModeratorRole;
  permissions: ModeratorPermissions;
  appointedAt: string;
  appointedBy: string;
}

function mapDbReport(r: any): Report {
  return {
    id: r.id,
    contentType: r.content_type,
    contentId: r.content_id,
    contentPreview: r.content_preview ?? '',
    reportedUserId: r.reported_user_id,
    reporterUserId: r.reporter_user_id,
    reason: r.reason,
    details: r.details ?? '',
    status: r.status ?? 'pending',
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? null,
    resolvedBy: r.resolved_by ?? null,
    resolution: r.resolution ?? null,
  };
}

function mapDbRestriction(r: any): UserRestriction {
  return {
    userId: r.user_id,
    type: r.type,
    reason: r.reason ?? '',
    startedAt: r.started_at,
    expiresAt: r.expires_at,
    issuedBy: r.issued_by ?? 'system',
    violationCount: r.violation_count ?? 1,
  };
}

function mapDbModerator(m: any): Moderator {
  return {
    userId: m.user_id,
    role: m.role ?? 'moderator',
    permissions: {
      viewReports: m.can_view_reports ?? true,
      resolveReports: m.can_resolve_reports ?? false,
      editPosts: m.can_edit_posts ?? false,
      deletePosts: m.can_delete_posts ?? false,
      deleteStories: m.can_delete_stories ?? false,
      banUsers: m.can_ban_users ?? false,
    },
    appointedAt: m.appointed_at,
    appointedBy: m.appointed_by ?? '',
  };
}

function mapDbModerationAction(a: any): ModerationAction {
  return {
    id: a.id,
    postId: a.post_id,
    targetUserId: a.target_user_id,
    moderatorId: a.moderator_id,
    actionType: a.action_type ?? 'remove_post',
    reason: a.reason ?? '',
    details: a.details ?? '',
    status: a.status ?? 'active',
    postSnapshot: a.post_snapshot ?? null,
    createdAt: a.created_at,
    restoredAt: a.restored_at ?? null,
    permanentlyDeletedAt: a.permanently_deleted_at ?? null,
  };
}

function mapDbAppeal(ap: any): ModerationAppeal {
  return {
    id: ap.id,
    actionId: ap.action_id,
    userId: ap.user_id,
    appealText: ap.appeal_text,
    status: ap.status ?? 'pending',
    reviewerId: ap.reviewer_id ?? null,
    reviewerNote: ap.reviewer_note ?? null,
    createdAt: ap.created_at,
    reviewedAt: ap.reviewed_at ?? null,
  };
}

export const [ModerationProvider, useModeration] = createContextHook(() => {
  useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);
  const [spamLog, setSpamLog] = useState<SpamEntry[]>([]);
  const [allUsers, setAllUsers] = useState<SocialUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fullDataLoaded, setFullDataLoaded] = useState<boolean>(false);
  const [coreLoaded, setCoreLoaded] = useState<boolean>(false);

  const loadCoreData = useCallback(async () => {
    if (coreLoaded) return;
    setIsLoading(true);
    try {
      console.log('[MODERATION] Loading core moderation data...');
      const [modsRes, restrictionsRes] = await Promise.all([
        supabase.from('moderators').select('*'),
        supabase.from('user_restrictions').select('*'),
      ]);
      setModerators((modsRes.data ?? []).map(mapDbModerator));
      setRestrictions((restrictionsRes.data ?? []).map(mapDbRestriction));
      setCoreLoaded(true);
      console.log('[MODERATION] Core data loaded:', modsRes.data?.length, 'moderators,', restrictionsRes.data?.length, 'restrictions');
    } catch (e) {
      console.log('[MODERATION] Core load error:', e);
    }
    setIsLoading(false);
  }, [coreLoaded]);

  const loadFullModerationData = useCallback(async () => {
    if (fullDataLoaded) return;
    console.log('[MODERATION] Loading full moderation data (admin/mod view)...');
    try {
      const [reportsRes, usersRes] = await Promise.all([
        supabase.from('reports').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
      ]);
      setReports((reportsRes.data ?? []).map(mapDbReport));
      setAllUsers(
        (usersRes.data ?? []).map((u: any) => ({
          id: u.id,
          username: u.username ?? '',
          displayName: u.display_name ?? '',
          bio: u.bio ?? '',
          avatarUrl: u.avatar_url ?? null,
          rank: u.rank ?? 'Neuling',
          rankIcon: u.rank_icon ?? 'Eye',
          ep: u.xp ?? 0,
          stampCount: u.stamp_count ?? 0,
          postCount: u.post_count ?? 0,
          friendCount: u.friend_count ?? 0,
        })),
      );
      setFullDataLoaded(true);
      console.log('[MODERATION] Full data loaded:', reportsRes.data?.length, 'reports,', usersRes.data?.length, 'users');
    } catch (e) {
      console.log('[MODERATION] Full data load error:', e);
    }
  }, [fullDataLoaded]);

  const refreshReports = useCallback(async () => {
    console.log('[MODERATION] Refreshing reports...');
    try {
      const reportsRes = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      setReports((reportsRes.data ?? []).map(mapDbReport));
      console.log('[MODERATION] Reports refreshed:', reportsRes.data?.length);
    } catch (e) {
      console.log('[MODERATION] Refresh reports error:', e);
    }
  }, []);

  const checkSpam = useCallback(
    (uid: string, content: string): { isSpam: boolean; reason: string } => {
      const now = Date.now();
      const recent = spamLog.filter((e) => e.userId === uid && now - new Date(e.timestamp).getTime() < 60000);
      if (recent.length >= 5) return { isSpam: true, reason: 'Zu viele Nachrichten in kurzer Zeit (>5 pro Minute)' };
      if (recent.filter((e) => e.content === content).length >= 2) return { isSpam: true, reason: 'Identischer Text wiederholt gesendet' };
      return { isSpam: false, reason: '' };
    },
    [spamLog],
  );

  const logActivity = useCallback((uid: string, content: string) => {
    setSpamLog((prev) => {
      const cutoff = Date.now() - 5 * 60000;
      const cleaned = prev.filter((e) => new Date(e.timestamp).getTime() > cutoff);
      return [...cleaned, { userId: uid, content, timestamp: new Date().toISOString() }];
    });
  }, []);

  const addRestriction = useCallback(
    async (restriction: Omit<UserRestriction, 'startedAt'>) => {
      const newRestriction: UserRestriction = { ...restriction, startedAt: new Date().toISOString() };
      setRestrictions((prev) => [
        ...prev.filter((r) => r.userId !== restriction.userId || r.type !== restriction.type),
        newRestriction,
      ]);
      await supabase.from('user_restrictions').insert({
        user_id: restriction.userId,
        type: restriction.type,
        reason: restriction.reason,
        expires_at: restriction.expiresAt,
        issued_by: restriction.issuedBy,
        violation_count: restriction.violationCount,
      });
    },
    [],
  );

  const removeRestriction = useCallback(async (uid: string, type: UserRestrictionType) => {
    setRestrictions((prev) => prev.filter((r) => !(r.userId === uid && r.type === type)));
    await supabase.from('user_restrictions').delete().eq('user_id', uid).eq('type', type);
  }, []);

  const isRestricted = useCallback(
    (uid: string, type?: UserRestrictionType): boolean => {
      const now = new Date().toISOString();
      return restrictions.some((r) => r.userId === uid && (!type || r.type === type) && r.expiresAt > now);
    },
    [restrictions],
  );

  const getActiveRestrictions = useCallback(
    (uid: string): UserRestriction[] => {
      const now = new Date().toISOString();
      return restrictions.filter((r) => r.userId === uid && r.expiresAt > now);
    },
    [restrictions],
  );

  const getAllRestrictions = useMemo(() => restrictions, [restrictions]);

  const autoHandleSpam = useCallback(
    (uid: string, content: string): { blocked: boolean; message: string } => {
      logActivity(uid, content);
      const spamResult = checkSpam(uid, content);
      if (!spamResult.isSpam) return { blocked: false, message: '' };

      const userReports = reports.filter((r) => r.reportedUserId === uid);
      const priorViolations = userReports.filter((r) => r.status === 'resolved').length;
      const activeR = restrictions.filter((r) => r.userId === uid && r.expiresAt > new Date().toISOString());

      let durationMinutes = 30;
      let banType: UserRestrictionType = 'comment_ban';
      let message = 'Du wurdest eingeschränkt. Du kannst die nächsten 30 Minuten keine Kommentare mehr schreiben.';

      if (activeR.length > 0 || priorViolations >= 2) {
        durationMinutes = 60;
        banType = 'like_ban';
        message = 'Du wurdest eingeschränkt. Du kannst die nächste Stunde keine Likes mehr vergeben.';
      }
      if (activeR.length > 1 || priorViolations >= 3) {
        durationMinutes = 24 * 60;
        banType = 'post_ban';
        message = 'Du wurdest eingeschränkt. Du kannst die nächsten 24 Stunden keine Beiträge oder Kommentare mehr schreiben.';
      }
      if (priorViolations >= 5) {
        durationMinutes = 7 * 24 * 60;
        banType = 'full_ban';
        message = 'Dein Konto wurde für 7 Tage vollständig gesperrt wegen wiederholter Verstöße.';
      }

      addRestriction({
        userId: uid,
        type: banType,
        reason: spamResult.reason,
        expiresAt: new Date(Date.now() + durationMinutes * 60000).toISOString(),
        issuedBy: 'system',
        violationCount: priorViolations + 1,
      });

      return { blocked: true, message };
    },
    [checkSpam, logActivity, addRestriction, reports, restrictions],
  );

  const submitReport = useCallback(
    async (report: Omit<Report, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy' | 'resolution'>) => {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          content_type: report.contentType,
          content_id: report.contentId,
          content_preview: report.contentPreview,
          reported_user_id: report.reportedUserId,
          reporter_user_id: report.reporterUserId,
          reason: report.reason,
          details: report.details,
        })
        .select('id, created_at')
        .single();

      if (error || !data) {
        console.log('[MODERATION] Submit report error:', error?.message);
        return null;
      }

      const newReport: Report = {
        ...report,
        id: data.id,
        status: 'pending',
        createdAt: data.created_at,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
      };
      setReports((prev) => [newReport, ...prev]);
      return newReport;
    },
    [],
  );

  const updateReportStatus = useCallback(
    async (reportId: string, status: ReportStatus, resolvedBy: string, resolution?: string) => {
      const isTerminal = status === 'resolved' || status === 'dismissed';
      const now = isTerminal ? new Date().toISOString() : null;

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                resolvedAt: isTerminal ? now : r.resolvedAt,
                resolvedBy: isTerminal ? resolvedBy : r.resolvedBy,
                resolution: resolution ?? r.resolution,
              }
            : r,
        ),
      );

      const dbUpdate: any = { status };
      if (isTerminal) {
        dbUpdate.resolved_at = now;
        dbUpdate.resolved_by = resolvedBy;
      }
      if (resolution !== undefined) dbUpdate.resolution = resolution;
      await supabase.from('reports').update(dbUpdate).eq('id', reportId);
    },
    [],
  );

  const deleteReport = useCallback(async (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    await supabase.from('reports').delete().eq('id', reportId);
  }, []);

  const canManageRole = useCallback(
    (requesterId: string, targetRole: ModeratorRole): boolean => {
      if (requesterId === HAUPTADMIN_ID) return true;
      const requester = moderators.find((m) => m.userId === requesterId);
      if (!requester) return false;
      if (requester.role === 'admin') return targetRole === 'moderator' || targetRole === 'super_moderator';
      return false;
    },
    [moderators],
  );

  const isHauptadmin = useCallback((uid: string): boolean => uid === HAUPTADMIN_ID, []);

  const addModerator = useCallback(
    async (uid: string, role: ModeratorRole, appointedBy: string) => {
      const perms = { ...DEFAULT_PERMISSIONS[role] };
      const mod: Moderator = { userId: uid, role, permissions: perms, appointedAt: new Date().toISOString(), appointedBy };

      setModerators((prev) => {
        const existing = prev.find((m) => m.userId === uid);
        return existing ? prev.map((m) => (m.userId === uid ? mod : m)) : [...prev, mod];
      });

      await supabase.from('moderators').upsert({
        user_id: uid,
        role,
        can_view_reports: perms.viewReports,
        can_resolve_reports: perms.resolveReports,
        can_edit_posts: perms.editPosts,
        can_delete_posts: perms.deletePosts,
        can_delete_stories: perms.deleteStories,
        can_ban_users: perms.banUsers,
        appointed_by: appointedBy,
      });
    },
    [],
  );

  const updateModeratorPermissions = useCallback(
    async (uid: string, permissions: Partial<ModeratorPermissions>) => {
      setModerators((prev) =>
        prev.map((m) => (m.userId === uid ? { ...m, permissions: { ...m.permissions, ...permissions } } : m)),
      );
      const dbUpdate: any = {};
      if (permissions.viewReports !== undefined) dbUpdate.can_view_reports = permissions.viewReports;
      if (permissions.resolveReports !== undefined) dbUpdate.can_resolve_reports = permissions.resolveReports;
      if (permissions.editPosts !== undefined) dbUpdate.can_edit_posts = permissions.editPosts;
      if (permissions.deletePosts !== undefined) dbUpdate.can_delete_posts = permissions.deletePosts;
      if (permissions.deleteStories !== undefined) dbUpdate.can_delete_stories = permissions.deleteStories;
      if (permissions.banUsers !== undefined) dbUpdate.can_ban_users = permissions.banUsers;
      await supabase.from('moderators').update(dbUpdate).eq('user_id', uid);
    },
    [],
  );

  const removeModerator = useCallback(
    async (uid: string, requestedBy?: string) => {
      if (uid === HAUPTADMIN_ID) return;
      const requester = moderators.find((m) => m.userId === requestedBy);
      const target = moderators.find((m) => m.userId === uid);
      if (requester && requester.role === 'admin' && target && target.role === 'admin') return;
      setModerators((prev) => prev.filter((m) => m.userId !== uid));
      await supabase.from('moderators').delete().eq('user_id', uid);
    },
    [moderators],
  );

  const isModerator = useCallback((uid: string): boolean => moderators.some((m) => m.userId === uid), [moderators]);
  const getModerator = useCallback((uid: string): Moderator | undefined => moderators.find((m) => m.userId === uid), [moderators]);
  const hasPermission = useCallback(
    (uid: string, permission: keyof ModeratorPermissions): boolean => {
      const mod = moderators.find((m) => m.userId === uid);
      return mod ? mod.permissions[permission] : false;
    },
    [moderators],
  );

  const pendingReports = useMemo(() => reports.filter((r) => r.status === 'pending' || r.status === 'reviewing'), [reports]);
  const resolvedReports = useMemo(() => reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed'), [reports]);
  const getReportsForContent = useCallback((contentId: string) => reports.filter((r) => r.contentId === contentId), [reports]);
  const getReportsForUser = useCallback((uid: string) => reports.filter((r) => r.reportedUserId === uid), [reports]);

  const getUserViolationStats = useCallback(
    (uid: string) => {
      const userReports = reports.filter((r) => r.reportedUserId === uid);
      const total = userReports.length;
      const pending = userReports.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;
      const resolved = userReports.filter((r) => r.status === 'resolved').length;
      const dismissed = userReports.filter((r) => r.status === 'dismissed').length;
      const reasons: Record<string, number> = {};
      userReports.forEach((r) => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });

      const rawScore = resolved * 2 + pending;
      const threatLevel = Math.min(rawScore / 10, 1);
      let threatLabel: string;
      let threatColor: string;
      if (threatLevel < 0.3) { threatLabel = 'Niedrig'; threatColor = '#4CAF50'; }
      else if (threatLevel < 0.6) { threatLabel = 'Mittel'; threatColor = '#FF9800'; }
      else if (threatLevel < 0.85) { threatLabel = 'Hoch'; threatColor = '#F44336'; }
      else { threatLabel = 'Kritisch'; threatColor = '#8B0000'; }

      const activeRestrictions = restrictions.filter((r) => r.userId === uid && r.expiresAt > new Date().toISOString());

      return {
        total, pending, resolved, dismissed, reasons,
        threatLevel, threatLabel, threatColor,
        activeRestrictions,
        isCurrentlyRestricted: activeRestrictions.length > 0,
      };
    },
    [reports, restrictions],
  );

  const getMostReportedUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => { counts[r.reportedUserId] = (counts[r.reportedUserId] || 0) + 1; });
    return Object.entries(counts)
      .map(([uid, count]) => ({
        userId: uid,
        count,
        user: allUsers.find((u) => u.id === uid),
        resolvedCount: reports.filter((r) => r.reportedUserId === uid && r.status === 'resolved').length,
        pendingCount: reports.filter((r) => r.reportedUserId === uid && (r.status === 'pending' || r.status === 'reviewing')).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [reports, allUsers]);

  const availableUsers = useMemo((): SocialUser[] => {
    const modIds = moderators.map((m) => m.userId);
    return allUsers.filter((u) => !modIds.includes(u.id));
  }, [moderators, allUsers]);

  const [moderationActions, setModerationActions] = useState<ModerationAction[]>([]);
  const [moderationAppeals, setModerationAppeals] = useState<ModerationAppeal[]>([]);
  const [actionsLoaded, setActionsLoaded] = useState<boolean>(false);
  const [removedPostIds, setRemovedPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_REMOVED_POSTS).then((raw) => {
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setRemovedPostIds(new Set(parsed));
        console.log('[MODERATION] Loaded', parsed.length, 'removed post IDs from storage');
      }
    }).catch((e) => console.log('[MODERATION] Error loading removed posts:', e));
  }, []);

  const persistRemovedPosts = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY_REMOVED_POSTS, JSON.stringify([...ids])).catch((e) =>
      console.log('[MODERATION] Error persisting removed posts:', e),
    );
  }, []);

  const loadModerationActions = useCallback(async () => {
    try {
      console.log('[MODERATION] Loading moderation actions & appeals...');
      const [actionsRes, appealsRes] = await Promise.all([
        supabase.from('moderation_actions').select('*').order('created_at', { ascending: false }),
        supabase.from('moderation_appeals').select('*').order('created_at', { ascending: false }),
      ]);
      if (actionsRes.data) {
        setModerationActions(actionsRes.data.map(mapDbModerationAction));
      }
      if (appealsRes.data) {
        setModerationAppeals(appealsRes.data.map(mapDbAppeal));
      }
      setActionsLoaded(true);
      console.log('[MODERATION] Loaded', actionsRes.data?.length ?? 0, 'actions,', appealsRes.data?.length ?? 0, 'appeals');
    } catch (e) {
      console.log('[MODERATION] Load actions error:', e);
    }
  }, []);

  const loadUserModerationData = useCallback(async (userId: string) => {
    try {
      console.log('[MODERATION] Loading user moderation data for:', userId);
      const [actionsRes, appealsRes] = await Promise.all([
        supabase.from('moderation_actions').select('*').eq('target_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('moderation_appeals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      const actions = (actionsRes.data ?? []).map(mapDbModerationAction);
      const appeals = (appealsRes.data ?? []).map(mapDbAppeal);
      setModerationActions((prev) => {
        const otherActions = prev.filter((a) => a.targetUserId !== userId);
        return [...otherActions, ...actions];
      });
      setModerationAppeals((prev) => {
        const otherAppeals = prev.filter((a) => a.userId !== userId);
        return [...otherAppeals, ...appeals];
      });
      console.log('[MODERATION] User data loaded:', actions.length, 'actions,', appeals.length, 'appeals');
      return { actions, appeals };
    } catch (e) {
      console.log('[MODERATION] Load user data error:', e);
      return { actions: [], appeals: [] };
    }
  }, []);

  const addRemovedPostId = useCallback((postId: string) => {
    setRemovedPostIds((prev) => {
      const next = new Set([...prev, postId]);
      persistRemovedPosts(next);
      return next;
    });
  }, [persistRemovedPosts]);

  const restoreRemovedPostId = useCallback((postId: string) => {
    setRemovedPostIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      persistRemovedPosts(next);
      return next;
    });
  }, [persistRemovedPosts]);

  const adminRemovePost = useCallback(async (
    post: FeedPost,
    moderatorId: string,
    reason: string,
    details: string,
  ): Promise<ModerationAction | null> => {
    try {
      console.log('[MODERATION] Admin removing post:', post.id, 'reason:', reason);

      addRemovedPostId(post.id);
      console.log('[MODERATION] Post added to local removed set:', post.id);

      const snapshot: FeedPost = { ...post };
      const { data, error } = await supabase
        .from('moderation_actions')
        .insert({
          post_id: post.id,
          target_user_id: post.userId === 'me' ? moderatorId : post.userId,
          moderator_id: moderatorId,
          action_type: 'remove_post',
          reason,
          details,
          status: 'active',
          post_snapshot: snapshot,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.log('[MODERATION] Admin remove post DB insert error:', error?.message);
      }

      let action: ModerationAction | null = null;
      if (data) {
        action = mapDbModerationAction(data);
        setModerationActions((prev) => [action!, ...prev]);
      }

      const targetUserId = post.userId === 'me' ? moderatorId : post.userId;

      const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
      if (deleteError) {
        console.log('[MODERATION] Post delete from DB error:', deleteError.message);
        let deleteError2: { message: string } | null = null;
        try {
          const rpcRes = await supabase.rpc('admin_delete_post', { post_id_param: post.id });
          deleteError2 = rpcRes.error;
        } catch {
          deleteError2 = { message: 'rpc not available' };
        }
        if (deleteError2) {
          console.log('[MODERATION] RPC delete also failed:', deleteError2.message);
        }
      } else {
        console.log('[MODERATION] Post deleted from DB:', post.id);
      }

      try {
        await supabase.from('inbox_notifications').insert({
          user_id: targetUserId,
          title: 'Beitrag entfernt',
          message: `Dein Beitrag wurde von einem Moderator entfernt. Grund: ${reason}${details ? ' – ' + details : ''}. Du kannst Widerspruch einlegen, wenn du die Entscheidung für ungerechtfertigt hältst.`,
          sent_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.log('[MODERATION] Notification insert error:', notifErr);
      }

      console.log('[MODERATION] Post removed, action id:', action?.id ?? 'local-only');
      return action;
    } catch (e) {
      console.log('[MODERATION] Admin remove post exception:', e);
      return null;
    }
  }, [addRemovedPostId]);

  const submitAppeal = useCallback(async (
    actionId: string,
    userId: string,
    appealText: string,
  ): Promise<ModerationAppeal | null> => {
    try {
      console.log('[MODERATION] Submitting appeal for action:', actionId);
      const existing = moderationAppeals.find((a) => a.actionId === actionId && a.status === 'pending');
      if (existing) {
        console.log('[MODERATION] Appeal already exists for this action');
        return null;
      }

      const { data, error } = await supabase
        .from('moderation_appeals')
        .insert({
          action_id: actionId,
          user_id: userId,
          appeal_text: appealText,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error || !data) {
        console.log('[MODERATION] Submit appeal error:', error?.message);
        return null;
      }

      const appeal = mapDbAppeal(data);
      setModerationAppeals((prev) => [appeal, ...prev]);
      console.log('[MODERATION] Appeal submitted:', appeal.id);
      return appeal;
    } catch (e) {
      console.log('[MODERATION] Submit appeal exception:', e);
      return null;
    }
  }, [moderationAppeals]);

  const reviewAppeal = useCallback(async (
    appealId: string,
    reviewerId: string,
    accepted: boolean,
    reviewerNote: string,
  ): Promise<boolean> => {
    try {
      const appeal = moderationAppeals.find((a) => a.id === appealId);
      if (!appeal) {
        console.log('[MODERATION] Appeal not found:', appealId);
        return false;
      }

      const newStatus: AppealStatus = accepted ? 'accepted' : 'rejected';
      const now = new Date().toISOString();

      console.log('[MODERATION] Reviewing appeal:', appealId, 'decision:', newStatus);

      const { error: appealError } = await supabase
        .from('moderation_appeals')
        .update({
          status: newStatus,
          reviewer_id: reviewerId,
          reviewer_note: reviewerNote,
          reviewed_at: now,
        })
        .eq('id', appealId);

      if (appealError) {
        console.log('[MODERATION] Review appeal error:', appealError.message);
        return false;
      }

      setModerationAppeals((prev) =>
        prev.map((a) =>
          a.id === appealId
            ? { ...a, status: newStatus, reviewerId, reviewerNote, reviewedAt: now }
            : a,
        ),
      );

      const action = moderationActions.find((a) => a.id === appeal.actionId);
      if (!action) return true;

      if (accepted) {
        const { error: restoreError } = await supabase
          .from('moderation_actions')
          .update({ status: 'restored', restored_at: now })
          .eq('id', appeal.actionId);

        if (!restoreError) {
          setModerationActions((prev) =>
            prev.map((a) =>
              a.id === appeal.actionId
                ? { ...a, status: 'restored' as ModerationActionStatus, restoredAt: now }
                : a,
            ),
          );
        }

        if (action.postSnapshot) {
          console.log('[MODERATION] Restoring post from snapshot...');
          const snap = action.postSnapshot as FeedPost;
          const restoreData: Record<string, unknown> = {
            id: action.postId,
            user_id: action.targetUserId,
            content: snap.content ?? '',
            media_urls: snap.mediaUrls ?? [],
            media_type: snap.mediaType ?? 'none',
          };
          if (snap.location) restoreData.location = snap.location;
          if (snap.taggedUserIds) restoreData.tagged_user_ids = snap.taggedUserIds;
          if (snap.tags) restoreData.tags = snap.tags;

          await supabase.from('posts').upsert(restoreData, { onConflict: 'id' });
          console.log('[MODERATION] Post restored successfully');
        }

        await supabase.from('inbox_notifications').insert({
          user_id: action.targetUserId,
          title: 'Widerspruch stattgegeben ✅',
          message: `Dein Widerspruch wurde geprüft und stattgegeben. Dein Beitrag wurde wiederhergestellt.${reviewerNote ? ' Anmerkung: ' + reviewerNote : ''}`,
          sent_at: now,
        });
      } else {
        const { error: permDeleteError } = await supabase
          .from('moderation_actions')
          .update({ status: 'permanently_deleted', permanently_deleted_at: now })
          .eq('id', appeal.actionId);

        if (!permDeleteError) {
          setModerationActions((prev) =>
            prev.map((a) =>
              a.id === appeal.actionId
                ? { ...a, status: 'permanently_deleted' as ModerationActionStatus, permanentlyDeletedAt: now }
                : a,
            ),
          );
        }

        await supabase.from('posts').delete().eq('id', action.postId);

        await supabase.from('inbox_notifications').insert({
          user_id: action.targetUserId,
          title: 'Widerspruch abgelehnt ❌',
          message: `Dein Widerspruch wurde erneut geprüft und abgelehnt. Der Beitrag bleibt unwiderruflich gelöscht.${reviewerNote ? ' Begründung: ' + reviewerNote : ''}`,
          sent_at: now,
        });
      }

      console.log('[MODERATION] Appeal reviewed successfully');
      return true;
    } catch (e) {
      console.log('[MODERATION] Review appeal exception:', e);
      return false;
    }
  }, [moderationAppeals, moderationActions]);

  const getUserModerationActions = useCallback(
    (userId: string): ModerationAction[] => {
      return moderationActions.filter((a) => a.targetUserId === userId);
    },
    [moderationActions],
  );

  const getAppealsForAction = useCallback(
    (actionId: string): ModerationAppeal[] => {
      return moderationAppeals.filter((a) => a.actionId === actionId);
    },
    [moderationAppeals],
  );

  const canUserAppeal = useCallback(
    (actionId: string): boolean => {
      const action = moderationActions.find((a) => a.id === actionId);
      if (!action || action.status !== 'active') return false;
      const existingAppeals = moderationAppeals.filter((a) => a.actionId === actionId);
      return !existingAppeals.some((a) => a.status === 'pending');
    },
    [moderationActions, moderationAppeals],
  );

  const pendingAppeals = useMemo(
    () => moderationAppeals.filter((a) => a.status === 'pending'),
    [moderationAppeals],
  );

  const activeModActions = useMemo(
    () => moderationActions.filter((a) => a.status === 'active'),
    [moderationActions],
  );

  const isPostModerated = useCallback(
    (postId: string): boolean => {
      if (removedPostIds.has(postId)) return true;
      return moderationActions.some((a) => a.postId === postId && a.status === 'active');
    },
    [moderationActions, removedPostIds],
  );

  return {
    reports,
    moderators,
    restrictions,
    isLoading,
    loadFullModerationData,
    refreshReports,
    submitReport,
    updateReportStatus,
    deleteReport,
    addModerator,
    updateModeratorPermissions,
    removeModerator,
    isModerator,
    getModerator,
    hasPermission,
    pendingReports,
    resolvedReports,
    getReportsForContent,
    getReportsForUser,
    getUserViolationStats,
    getMostReportedUsers,
    availableUsers,
    canManageRole,
    isHauptadmin,
    checkSpam,
    logActivity,
    autoHandleSpam,
    addRestriction,
    removeRestriction,
    isRestricted,
    getActiveRestrictions,
    getAllRestrictions,
    loadCoreData,
    moderationActions,
    moderationAppeals,
    loadModerationActions,
    loadUserModerationData,
    adminRemovePost,
    submitAppeal,
    reviewAppeal,
    getUserModerationActions,
    getAppealsForAction,
    canUserAppeal,
    pendingAppeals,
    activeModActions,
    isPostModerated,
    actionsLoaded,
    removedPostIds,
    addRemovedPostId,
    restoreRemovedPostId,
  };
});
