import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type {
  TrainingActivity,
  Trupp,
  TruppMember,
  TruppMeeting,
  Challenge,
  ChallengeResult,
  WorkoutLog,
  SportCategory,
  SkillLevel,
  CheckInSession,
  CheckInEntry,
  CheckInToken,
} from '@/constants/kaderschmiede';
import {
  CHECKIN_PROXIMITY_RADIUS_M,
  CHECKIN_TOKEN_ROTATION_S,
  CHECKIN_TOKEN_VALIDITY_S,
  CHECKIN_MAX_GPS_ACCURACY_M,
} from '@/constants/kaderschmiede';

function mapDbActivity(a: any, participants: string[]): TrainingActivity {
  return {
    id: a.id,
    userId: a.user_id,
    userName: a.user_name ?? '',
    type: a.type as SportCategory,
    title: a.title,
    description: a.description ?? '',
    city: a.city,
    bundesland: a.bundesland,
    latitude: a.latitude ?? 0,
    longitude: a.longitude ?? 0,
    dateTime: a.date_time,
    level: a.level as SkillLevel,
    maxParticipants: a.max_participants ?? 10,
    participants,
    isRecurring: a.is_recurring ?? false,
    createdAt: a.created_at,
  };
}

function mapDbTrupp(
  t: any,
  members: TruppMember[],
  memberIds: string[],
  meetings: TruppMeeting[],
): Trupp {
  return {
    id: t.id,
    name: t.name,
    motto: t.motto ?? '',
    description: t.description ?? '',
    sport: t.sport as SportCategory,
    city: t.city,
    bundesland: t.bundesland,
    leaderId: t.leader_id,
    memberIds,
    members,
    meetings,
    isOpen: t.is_open ?? true,
    createdAt: t.created_at,
    weeklyGoal: t.weekly_goal ?? '',
    streak: t.streak ?? 0,
  };
}

function mapDbChallenge(c: any, participantIds: string[], results: ChallengeResult[]): Challenge {
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    type: c.type as Challenge['type'],
    sport: c.sport as SportCategory,
    creatorId: c.creator_id,
    participantIds,
    startDate: c.start_date,
    endDate: c.end_date,
    goal: c.goal ?? 0,
    unit: c.unit ?? '',
    results,
    isActive: c.is_active ?? true,
  };
}

function generateCheckInCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateNonce(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function getCurrentEpoch(): number {
  return Math.floor(Date.now() / (CHECKIN_TOKEN_ROTATION_S * 1000));
}

function encodeToken(checkinId: string, epoch: number, nonce: string): string {
  return `KADER:${checkinId}:${epoch}:${nonce}`;
}

function decodeToken(tokenStr: string): CheckInToken | null {
  const parts = tokenStr.split(':');
  if (parts.length !== 4 || parts[0] !== 'KADER') return null;
  const epoch = parseInt(parts[2], 10);
  if (isNaN(epoch)) return null;
  return { checkinId: parts[1], epoch, nonce: parts[3] };
}

function isTokenValid(token: CheckInToken): boolean {
  const currentEpoch = getCurrentEpoch();
  const maxAge = Math.ceil(CHECKIN_TOKEN_VALIDITY_S / CHECKIN_TOKEN_ROTATION_S);
  return Math.abs(currentEpoch - token.epoch) <= maxAge;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const [KaderschmiedeProvider, useKaderschmiede] = createContextHook(() => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [activities, setActivities] = useState<TrainingActivity[]>([]);
  const [trupps, setTrupps] = useState<Trupp[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportCategory | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userNameCache, setUserNameCache] = useState<Record<string, string>>({});
  const [userAvatarCache, setUserAvatarCache] = useState<Record<string, string | null>>({});
  const [activeCheckIn, setActiveCheckIn] = useState<CheckInSession | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        console.log('[KADERSCHMIEDE] Loading data for user:', userId);

        const [
          activitiesRes,
          actParticipantsRes,
          truppsRes,
          truppMembersRes,
          truppMeetingsRes,
          meetingAttendeesRes,
          challengesRes,
          challengeParticipantsRes,
          challengeResultsRes,
          workoutLogsRes,
          usersRes,
        ] = await Promise.all([
          supabase.from('kaderschmiede_activities').select('*').order('date_time', { ascending: true }),
          supabase.from('kaderschmiede_activity_participants').select('*'),
          supabase.from('kaderschmiede_trupps').select('*').order('created_at', { ascending: false }),
          supabase.from('kaderschmiede_trupp_members').select('*'),
          supabase.from('kaderschmiede_trupp_meetings').select('*').order('date_time', { ascending: true }),
          supabase.from('kaderschmiede_meeting_attendees').select('*'),
          supabase.from('kaderschmiede_challenges').select('*').order('created_at', { ascending: false }),
          supabase.from('kaderschmiede_challenge_participants').select('*'),
          supabase.from('kaderschmiede_challenge_results').select('*'),
          supabase.from('kaderschmiede_workout_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('users').select('id, display_name, avatar_url'),
        ]);

        const userMap: Record<string, { name: string; avatarUrl: string | null }> = {};
        for (const u of (usersRes.data ?? [])) {
          userMap[u.id] = { name: u.display_name ?? '', avatarUrl: u.avatar_url ?? null };
        }
        const nameCache: Record<string, string> = {};
        const avatarCache: Record<string, string | null> = {};
        for (const u of (usersRes.data ?? [])) {
          nameCache[u.id] = u.display_name ?? 'Unbekannt';
          avatarCache[u.id] = u.avatar_url ?? null;
        }
        setUserNameCache(nameCache);
        setUserAvatarCache(avatarCache);

        const actPartMap: Record<string, string[]> = {};
        for (const ap of (actParticipantsRes.data ?? [])) {
          if (!actPartMap[ap.activity_id]) actPartMap[ap.activity_id] = [];
          actPartMap[ap.activity_id].push(ap.user_id);
        }

        const mappedActivities = (activitiesRes.data ?? []).map((a: any) => {
          const participants = actPartMap[a.id] ?? [];
          return mapDbActivity(
            { ...a, user_name: userMap[a.user_id]?.name ?? '' },
            participants,
          );
        });
        setActivities(mappedActivities);

        const truppMemberMap: Record<string, TruppMember[]> = {};
        const truppMemberIdMap: Record<string, string[]> = {};
        for (const tm of (truppMembersRes.data ?? [])) {
          if (!truppMemberMap[tm.trupp_id]) truppMemberMap[tm.trupp_id] = [];
          if (!truppMemberIdMap[tm.trupp_id]) truppMemberIdMap[tm.trupp_id] = [];
          truppMemberMap[tm.trupp_id].push({
            id: tm.user_id,
            name: userMap[tm.user_id]?.name ?? 'Unbekannt',
            avatarUrl: userMap[tm.user_id]?.avatarUrl ?? null,
            role: tm.role as 'leader' | 'member',
            joinedAt: tm.joined_at,
          });
          truppMemberIdMap[tm.trupp_id].push(tm.user_id);
        }

        const meetingAttendeeMap: Record<string, string[]> = {};
        for (const ma of (meetingAttendeesRes.data ?? [])) {
          if (!meetingAttendeeMap[ma.meeting_id]) meetingAttendeeMap[ma.meeting_id] = [];
          meetingAttendeeMap[ma.meeting_id].push(ma.user_id);
        }

        const truppMeetingMap: Record<string, TruppMeeting[]> = {};
        for (const m of (truppMeetingsRes.data ?? [])) {
          if (!truppMeetingMap[m.trupp_id]) truppMeetingMap[m.trupp_id] = [];
          truppMeetingMap[m.trupp_id].push({
            id: m.id,
            truppId: m.trupp_id,
            title: m.title,
            description: m.description ?? '',
            dateTime: m.date_time,
            location: m.location ?? '',
            city: m.city ?? '',
            attendeeIds: meetingAttendeeMap[m.id] ?? [],
          });
        }

        const mappedTrupps = (truppsRes.data ?? []).map((t: any) =>
          mapDbTrupp(
            t,
            truppMemberMap[t.id] ?? [],
            truppMemberIdMap[t.id] ?? [],
            truppMeetingMap[t.id] ?? [],
          ),
        );
        setTrupps(mappedTrupps);

        const chPartMap: Record<string, string[]> = {};
        for (const cp of (challengeParticipantsRes.data ?? [])) {
          if (!chPartMap[cp.challenge_id]) chPartMap[cp.challenge_id] = [];
          chPartMap[cp.challenge_id].push(cp.user_id);
        }

        const chResultMap: Record<string, ChallengeResult[]> = {};
        for (const cr of (challengeResultsRes.data ?? [])) {
          if (!chResultMap[cr.challenge_id]) chResultMap[cr.challenge_id] = [];
          chResultMap[cr.challenge_id].push({
            userId: cr.user_id,
            value: cr.value,
            proofUrl: cr.proof_url ?? undefined,
            submittedAt: cr.submitted_at,
          });
        }

        const mappedChallenges = (challengesRes.data ?? []).map((c: any) =>
          mapDbChallenge(c, chPartMap[c.id] ?? [], chResultMap[c.id] ?? []),
        );
        setChallenges(mappedChallenges);

        const mappedLogs: WorkoutLog[] = (workoutLogsRes.data ?? []).map((l: any) => ({
          id: l.id,
          userId: l.user_id,
          exercise: l.exercise,
          reps: l.reps ?? undefined,
          sets: l.sets ?? undefined,
          duration: l.duration ?? undefined,
          distance: l.distance ?? undefined,
          notes: l.notes ?? '',
          createdAt: l.created_at,
        }));
        setWorkoutLogs(mappedLogs);

        console.log('[KADERSCHMIEDE] Data loaded:', {
          activities: mappedActivities.length,
          trupps: mappedTrupps.length,
          challenges: mappedChallenges.length,
          logs: mappedLogs.length,
        });
      } catch (e) {
        console.log('[KADERSCHMIEDE] Load error:', e);
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const upcomingActivities = useMemo(() => {
    const nowMs = Date.now();
    let filtered = activities.filter(a => new Date(a.dateTime).getTime() > nowMs);
    if (selectedSport) {
      filtered = filtered.filter(a => a.type === selectedSport);
    }
    if (selectedLevel) {
      filtered = filtered.filter(a => a.level === selectedLevel);
    }
    return filtered.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [activities, selectedSport, selectedLevel]);

  const activeChallenges = useMemo(
    () => challenges.filter(c => c.isActive),
    [challenges],
  );

  const activitiesByBundesland = useMemo(() => {
    const map: Record<string, number> = {};
    activities.forEach(a => {
      map[a.bundesland] = (map[a.bundesland] ?? 0) + 1;
    });
    return map;
  }, [activities]);

  const joinActivity = useCallback(async (activityId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Joining activity:', activityId);

    setActivities(prev =>
      prev.map(a => {
        if (a.id === activityId && !a.participants.includes(userId) && a.participants.length < a.maxParticipants) {
          return { ...a, participants: [...a.participants, userId] };
        }
        return a;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_activity_participants')
      .insert({ activity_id: activityId, user_id: userId });

    if (error) {
      console.log('[KADERSCHMIEDE] Join activity error:', error.message);
      setActivities(prev =>
        prev.map(a => {
          if (a.id === activityId) {
            return { ...a, participants: a.participants.filter(p => p !== userId) };
          }
          return a;
        }),
      );
    }
  }, [userId]);

  const leaveActivity = useCallback(async (activityId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Leaving activity:', activityId);

    setActivities(prev =>
      prev.map(a => {
        if (a.id === activityId) {
          return { ...a, participants: a.participants.filter(p => p !== userId) };
        }
        return a;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_activity_participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId);

    if (error) {
      console.log('[KADERSCHMIEDE] Leave activity error:', error.message);
    }
  }, [userId]);

  const createActivity = useCallback(async (
    activity: Omit<TrainingActivity, 'id' | 'userId' | 'userName' | 'participants' | 'createdAt'>,
  ) => {
    if (!userId || !user) return;
    console.log('[KADERSCHMIEDE] Creating activity:', activity.title);

    const { data, error } = await supabase
      .from('kaderschmiede_activities')
      .insert({
        user_id: userId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        city: activity.city,
        bundesland: activity.bundesland,
        latitude: activity.latitude,
        longitude: activity.longitude,
        date_time: activity.dateTime,
        level: activity.level,
        max_participants: activity.maxParticipants,
        is_recurring: activity.isRecurring,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Create activity error:', error?.message);
      return;
    }

    await supabase
      .from('kaderschmiede_activity_participants')
      .insert({ activity_id: data.id, user_id: userId });

    const newActivity = mapDbActivity(
      { ...data, user_name: user.name },
      [userId],
    );
    setActivities(prev => [newActivity, ...prev]);
  }, [userId, user]);

  const joinTrupp = useCallback(async (truppId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Joining trupp:', truppId);

    const trupp = trupps.find(t => t.id === truppId);
    if (!trupp || trupp.memberIds.includes(userId) || !trupp.isOpen) return;

    setTrupps(prev =>
      prev.map(t => {
        if (t.id === truppId) {
          return {
            ...t,
            memberIds: [...t.memberIds, userId],
            members: [...t.members, {
              id: userId,
              name: user?.name ?? '',
              avatarUrl: null,
              role: 'member' as const,
              joinedAt: new Date().toISOString(),
            }],
          };
        }
        return t;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_trupp_members')
      .insert({ trupp_id: truppId, user_id: userId, role: 'member' });

    if (error) {
      console.log('[KADERSCHMIEDE] Join trupp error:', error.message);
      setTrupps(prev =>
        prev.map(t => {
          if (t.id === truppId) {
            return {
              ...t,
              memberIds: t.memberIds.filter(m => m !== userId),
              members: t.members.filter(m => m.id !== userId),
            };
          }
          return t;
        }),
      );
    }
  }, [userId, user, trupps]);

  const leaveTrupp = useCallback(async (truppId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Leaving trupp:', truppId);

    const trupp = trupps.find(t => t.id === truppId);
    if (!trupp || trupp.leaderId === userId) return;

    setTrupps(prev =>
      prev.map(t => {
        if (t.id === truppId) {
          return {
            ...t,
            memberIds: t.memberIds.filter(m => m !== userId),
            members: t.members.filter(m => m.id !== userId),
          };
        }
        return t;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_trupp_members')
      .delete()
      .eq('trupp_id', truppId)
      .eq('user_id', userId);

    if (error) {
      console.log('[KADERSCHMIEDE] Leave trupp error:', error.message);
    }
  }, [userId, trupps]);

  const createTrupp = useCallback(async (
    trupp: Omit<Trupp, 'id' | 'leaderId' | 'memberIds' | 'members' | 'meetings' | 'createdAt' | 'streak'>,
  ) => {
    if (!userId || !user) return;
    console.log('[KADERSCHMIEDE] Creating trupp:', trupp.name);

    const { data, error } = await supabase
      .from('kaderschmiede_trupps')
      .insert({
        name: trupp.name,
        motto: trupp.motto,
        description: trupp.description,
        sport: trupp.sport,
        city: trupp.city,
        bundesland: trupp.bundesland,
        leader_id: userId,
        is_open: trupp.isOpen,
        weekly_goal: trupp.weeklyGoal,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Create trupp error:', error?.message);
      return;
    }

    await supabase
      .from('kaderschmiede_trupp_members')
      .insert({ trupp_id: data.id, user_id: userId, role: 'leader' });

    const leaderMember: TruppMember = {
      id: userId,
      name: user.name,
      avatarUrl: null,
      role: 'leader',
      joinedAt: new Date().toISOString(),
    };

    const newTrupp = mapDbTrupp(data, [leaderMember], [userId], []);
    setTrupps(prev => [newTrupp, ...prev]);
  }, [userId, user]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Joining challenge:', challengeId);

    setChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId && !c.participantIds.includes(userId)) {
          return { ...c, participantIds: [...c.participantIds, userId] };
        }
        return c;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_challenge_participants')
      .insert({ challenge_id: challengeId, user_id: userId });

    if (error) {
      console.log('[KADERSCHMIEDE] Join challenge error:', error.message);
      setChallenges(prev =>
        prev.map(c => {
          if (c.id === challengeId) {
            return { ...c, participantIds: c.participantIds.filter(p => p !== userId) };
          }
          return c;
        }),
      );
    }
  }, [userId]);

  const createChallenge = useCallback(async (
    challenge: Omit<Challenge, 'id' | 'creatorId' | 'participantIds' | 'results' | 'isActive'>,
  ) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Creating challenge:', challenge.title);

    const { data, error } = await supabase
      .from('kaderschmiede_challenges')
      .insert({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        sport: challenge.sport,
        creator_id: userId,
        start_date: challenge.startDate,
        end_date: challenge.endDate,
        goal: challenge.goal,
        unit: challenge.unit,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Create challenge error:', error?.message);
      return;
    }

    await supabase
      .from('kaderschmiede_challenge_participants')
      .insert({ challenge_id: data.id, user_id: userId });

    const newChallenge = mapDbChallenge(data, [userId], []);
    setChallenges(prev => [newChallenge, ...prev]);
  }, [userId]);

  const submitChallengeResult = useCallback(async (
    challengeId: string,
    value: number,
    proofUrl?: string,
  ) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Submitting challenge result:', challengeId, value);

    const { data, error } = await supabase
      .from('kaderschmiede_challenge_results')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        value,
        proof_url: proofUrl ?? null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Submit result error:', error?.message);
      return;
    }

    const result: ChallengeResult = {
      userId,
      value: data.value,
      proofUrl: data.proof_url ?? undefined,
      submittedAt: data.submitted_at,
    };

    setChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId) {
          return { ...c, results: [...c.results, result] };
        }
        return c;
      }),
    );
  }, [userId]);

  const addWorkoutLog = useCallback(async (
    log: Omit<WorkoutLog, 'id' | 'userId' | 'createdAt'>,
  ) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Adding workout log:', log.exercise);

    const { data, error } = await supabase
      .from('kaderschmiede_workout_logs')
      .insert({
        user_id: userId,
        exercise: log.exercise,
        reps: log.reps ?? null,
        sets: log.sets ?? null,
        duration: log.duration ?? null,
        distance: log.distance ?? null,
        notes: log.notes,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Add log error:', error?.message);
      return;
    }

    const newLog: WorkoutLog = {
      id: data.id,
      userId: data.user_id,
      exercise: data.exercise,
      reps: data.reps ?? undefined,
      sets: data.sets ?? undefined,
      duration: data.duration ?? undefined,
      distance: data.distance ?? undefined,
      notes: data.notes ?? '',
      createdAt: data.created_at,
    };
    setWorkoutLogs(prev => [newLog, ...prev]);
  }, [userId]);

  const attendMeeting = useCallback(async (truppId: string, meetingId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Attending meeting:', meetingId);

    setTrupps(prev =>
      prev.map(t => {
        if (t.id === truppId) {
          return {
            ...t,
            meetings: t.meetings.map(m => {
              if (m.id === meetingId && !m.attendeeIds.includes(userId)) {
                return { ...m, attendeeIds: [...m.attendeeIds, userId] };
              }
              return m;
            }),
          };
        }
        return t;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_meeting_attendees')
      .insert({ meeting_id: meetingId, user_id: userId });

    if (error) {
      console.log('[KADERSCHMIEDE] Attend meeting error:', error.message);
    }
  }, [userId]);

  const leaveMeeting = useCallback(async (truppId: string, meetingId: string) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Leaving meeting:', meetingId);

    setTrupps(prev =>
      prev.map(t => {
        if (t.id === truppId) {
          return {
            ...t,
            meetings: t.meetings.map(m => {
              if (m.id === meetingId) {
                return { ...m, attendeeIds: m.attendeeIds.filter(id => id !== userId) };
              }
              return m;
            }),
          };
        }
        return t;
      }),
    );

    const { error } = await supabase
      .from('kaderschmiede_meeting_attendees')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    if (error) {
      console.log('[KADERSCHMIEDE] Leave meeting error:', error.message);
    }
  }, [userId]);

  const createMeeting = useCallback(async (
    truppId: string,
    meeting: Omit<TruppMeeting, 'id' | 'truppId' | 'attendeeIds'>,
  ) => {
    if (!userId) return;
    console.log('[KADERSCHMIEDE] Creating meeting for trupp:', truppId);

    const { data, error } = await supabase
      .from('kaderschmiede_trupp_meetings')
      .insert({
        trupp_id: truppId,
        title: meeting.title,
        description: meeting.description,
        date_time: meeting.dateTime,
        location: meeting.location,
        city: meeting.city,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Create meeting error:', error?.message);
      return;
    }

    await supabase
      .from('kaderschmiede_meeting_attendees')
      .insert({ meeting_id: data.id, user_id: userId });

    const newMeeting: TruppMeeting = {
      id: data.id,
      truppId,
      title: data.title,
      description: data.description ?? '',
      dateTime: data.date_time,
      location: data.location ?? '',
      city: data.city ?? '',
      attendeeIds: [userId],
    };

    setTrupps(prev =>
      prev.map(t => {
        if (t.id === truppId) {
          return { ...t, meetings: [...t.meetings, newMeeting] };
        }
        return t;
      }),
    );
  }, [userId]);

  const myTrupps = useMemo(
    () => trupps.filter(t => t.memberIds.includes(userId)),
    [trupps, userId],
  );

  const myChallenges = useMemo(
    () => challenges.filter(c => c.participantIds.includes(userId)),
    [challenges, userId],
  );

  const totalWorkouts = workoutLogs.length;

  const weeklyStreak = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return workoutLogs.filter(l => new Date(l.createdAt).getTime() > weekAgo).length;
  }, [workoutLogs]);

  const getTruppById = useCallback(
    (id: string) => trupps.find(t => t.id === id) ?? null,
    [trupps],
  );

  const getChallengeById = useCallback(
    (id: string) => challenges.find(c => c.id === id) ?? null,
    [challenges],
  );

  const getActivityById = useCallback(
    (id: string) => activities.find(a => a.id === id) ?? null,
    [activities],
  );

  const getMemberName = useCallback(
    (uid: string): string => userNameCache[uid] ?? 'Unbekannt',
    [userNameCache],
  );

  const getMemberAvatar = useCallback(
    (uid: string): string | null => userAvatarCache[uid] ?? null,
    [userAvatarCache],
  );

  const startCheckIn = useCallback(async (
    type: 'activity' | 'meeting',
    sessionId: string,
    participantIds: string[],
    hostLocation: { latitude: number; longitude: number; accuracy: number },
  ): Promise<CheckInSession | null> => {
    if (!userId) return null;
    console.log('[KADERSCHMIEDE] Starting check-in for', type, sessionId, 'at', hostLocation);

    const code = generateCheckInCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('kaderschmiede_checkins')
      .insert({
        type,
        session_id: sessionId,
        host_user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        host_latitude: hostLocation.latitude,
        host_longitude: hostLocation.longitude,
        host_accuracy: hostLocation.accuracy,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.log('[KADERSCHMIEDE] Start check-in error:', error?.message);
      const localSession: CheckInSession = {
        id: `local_${Date.now()}`,
        type,
        sessionId,
        hostUserId: userId,
        code,
        participantIds,
        checkedInUsers: [],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        hostLatitude: hostLocation.latitude,
        hostLongitude: hostLocation.longitude,
        hostAccuracy: hostLocation.accuracy,
      };
      setActiveCheckIn(localSession);
      return localSession;
    }

    const session: CheckInSession = {
      id: data.id,
      type,
      sessionId,
      hostUserId: userId,
      code: data.code,
      participantIds,
      checkedInUsers: [],
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      isActive: true,
      hostLatitude: hostLocation.latitude,
      hostLongitude: hostLocation.longitude,
      hostAccuracy: hostLocation.accuracy,
    };
    setActiveCheckIn(session);
    console.log('[KADERSCHMIEDE] Check-in started with code:', code, 'GPS:', hostLocation);
    return session;
  }, [userId]);

  const generateCurrentToken = useCallback((): string | null => {
    if (!activeCheckIn) return null;
    const epoch = getCurrentEpoch();
    const nonce = generateNonce();
    return encodeToken(activeCheckIn.id, epoch, nonce);
  }, [activeCheckIn]);

  const performCheckIn = useCallback(async (
    tokenString: string,
    participantLocation: { latitude: number; longitude: number; accuracy: number; mocked?: boolean },
  ): Promise<{ success: boolean; message: string }> => {
    if (!userId || !user) return { success: false, message: 'Nicht eingeloggt' };
    console.log('[KADERSCHMIEDE] Performing secure check-in with token');

    const token = decodeToken(tokenString);
    if (!token) {
      console.log('[KADERSCHMIEDE] Invalid token format');
      return { success: false, message: 'Ungültiger QR-Code' };
    }

    if (!isTokenValid(token)) {
      console.log('[KADERSCHMIEDE] Token expired, epoch:', token.epoch, 'current:', getCurrentEpoch());
      return { success: false, message: 'QR-Code abgelaufen – bitte erneut scannen' };
    }

    if (participantLocation.mocked) {
      console.log('[KADERSCHMIEDE] SECURITY: Mocked GPS detected!');
      return { success: false, message: 'Gefälschter Standort erkannt! GPS-Spoofing ist nicht erlaubt.' };
    }

    if (participantLocation.accuracy > CHECKIN_MAX_GPS_ACCURACY_M) {
      console.log('[KADERSCHMIEDE] GPS accuracy too low:', participantLocation.accuracy);
      return { success: false, message: `GPS-Genauigkeit zu niedrig (${Math.round(participantLocation.accuracy)}m). Bitte geh ins Freie.` };
    }

    let checkinData: any = null;
    let hostLat = 0;
    let hostLng = 0;

    if (activeCheckIn && activeCheckIn.id === token.checkinId) {
      checkinData = activeCheckIn;
      hostLat = activeCheckIn.hostLatitude;
      hostLng = activeCheckIn.hostLongitude;
    } else {
      const { data } = await supabase
        .from('kaderschmiede_checkins')
        .select('*')
        .eq('id', token.checkinId)
        .eq('is_active', true)
        .single();

      if (!data) {
        return { success: false, message: 'Check-In Session nicht gefunden oder abgelaufen' };
      }
      checkinData = data;
      hostLat = data.host_latitude ?? 0;
      hostLng = data.host_longitude ?? 0;
    }

    const distance = haversineDistance(
      participantLocation.latitude, participantLocation.longitude,
      hostLat, hostLng,
    );
    console.log('[KADERSCHMIEDE] Distance to host:', Math.round(distance), 'm');

    if (distance > CHECKIN_PROXIMITY_RADIUS_M) {
      return {
        success: false,
        message: `Du bist ${Math.round(distance)}m entfernt. Max. ${CHECKIN_PROXIMITY_RADIUS_M}m erlaubt.`,
      };
    }

    const checkinId = activeCheckIn?.id === token.checkinId ? activeCheckIn.id : (checkinData as any).id;

    const alreadyCheckedIn = activeCheckIn?.checkedInUsers.some(e => e.userId === userId);
    if (alreadyCheckedIn) {
      return { success: false, message: 'Du bist bereits eingecheckt' };
    }

    const { data: existingEntry } = await supabase
      .from('kaderschmiede_checkin_entries')
      .select('id')
      .eq('checkin_id', checkinId)
      .eq('user_id', userId)
      .single();

    if (existingEntry) {
      return { success: false, message: 'Du bist bereits eingecheckt' };
    }

    await supabase.from('kaderschmiede_checkin_entries').insert({
      checkin_id: checkinId,
      user_id: userId,
      latitude: participantLocation.latitude,
      longitude: participantLocation.longitude,
      accuracy: participantLocation.accuracy,
      distance_to_host: distance,
      is_mocked: participantLocation.mocked ?? false,
      token_epoch: token.epoch,
    }).then((res: any) => {
      if (res.error) console.log('[KADERSCHMIEDE] Check-in entry DB error:', res.error.message);
    });

    const entry: CheckInEntry = {
      userId,
      userName: user.name,
      avatarUrl: userAvatarCache[userId] ?? null,
      checkedInAt: new Date().toISOString(),
      latitude: participantLocation.latitude,
      longitude: participantLocation.longitude,
      accuracy: participantLocation.accuracy,
      distanceToHost: distance,
      isMocked: participantLocation.mocked ?? false,
    };

    setActiveCheckIn(prev => {
      if (!prev) return prev;
      return { ...prev, checkedInUsers: [...prev.checkedInUsers, entry] };
    });

    console.log('[KADERSCHMIEDE] Secure check-in successful, distance:', Math.round(distance), 'm');
    return { success: true, message: `Erfolgreich eingecheckt! (${Math.round(distance)}m Entfernung)` };
  }, [userId, user, activeCheckIn, userAvatarCache]);

  const endCheckIn = useCallback(async () => {
    if (!activeCheckIn) return;
    console.log('[KADERSCHMIEDE] Ending check-in:', activeCheckIn.id);

    await supabase
      .from('kaderschmiede_checkins')
      .update({ is_active: false })
      .eq('id', activeCheckIn.id);

    setActiveCheckIn(null);
  }, [activeCheckIn]);

  const refreshCheckIn = useCallback(async () => {
    if (!activeCheckIn) return;
    console.log('[KADERSCHMIEDE] Refreshing check-in entries');

    const { data: entries } = await supabase
      .from('kaderschmiede_checkin_entries')
      .select('*')
      .eq('checkin_id', activeCheckIn.id);

    if (entries) {
      const checkedInUsers: CheckInEntry[] = entries.map((e: any) => ({
        userId: e.user_id,
        userName: userNameCache[e.user_id] ?? 'Unbekannt',
        avatarUrl: userAvatarCache[e.user_id] ?? null,
        checkedInAt: e.checked_in_at ?? e.created_at,
      }));
      setActiveCheckIn(prev => prev ? { ...prev, checkedInUsers } : prev);
    }
  }, [activeCheckIn, userNameCache, userAvatarCache]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        activitiesRes,
        actParticipantsRes,
        truppsRes,
        truppMembersRes,
        truppMeetingsRes,
        meetingAttendeesRes,
        challengesRes,
        challengeParticipantsRes,
        challengeResultsRes,
        workoutLogsRes,
        usersRes,
      ] = await Promise.all([
        supabase.from('kaderschmiede_activities').select('*').order('date_time', { ascending: true }),
        supabase.from('kaderschmiede_activity_participants').select('*'),
        supabase.from('kaderschmiede_trupps').select('*').order('created_at', { ascending: false }),
        supabase.from('kaderschmiede_trupp_members').select('*'),
        supabase.from('kaderschmiede_trupp_meetings').select('*').order('date_time', { ascending: true }),
        supabase.from('kaderschmiede_meeting_attendees').select('*'),
        supabase.from('kaderschmiede_challenges').select('*').order('created_at', { ascending: false }),
        supabase.from('kaderschmiede_challenge_participants').select('*'),
        supabase.from('kaderschmiede_challenge_results').select('*'),
        supabase.from('kaderschmiede_workout_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('users').select('id, display_name, avatar_url'),
      ]);

      const userMap: Record<string, { name: string; avatarUrl: string | null }> = {};
      const nameCache: Record<string, string> = {};
      const avatarCache: Record<string, string | null> = {};
      for (const u of (usersRes.data ?? [])) {
        userMap[u.id] = { name: u.display_name ?? '', avatarUrl: u.avatar_url ?? null };
        nameCache[u.id] = u.display_name ?? 'Unbekannt';
        avatarCache[u.id] = u.avatar_url ?? null;
      }
      setUserNameCache(nameCache);
      setUserAvatarCache(avatarCache);

      const actPartMap: Record<string, string[]> = {};
      for (const ap of (actParticipantsRes.data ?? [])) {
        if (!actPartMap[ap.activity_id]) actPartMap[ap.activity_id] = [];
        actPartMap[ap.activity_id].push(ap.user_id);
      }
      setActivities((activitiesRes.data ?? []).map((a: any) =>
        mapDbActivity({ ...a, user_name: userMap[a.user_id]?.name ?? '' }, actPartMap[a.id] ?? []),
      ));

      const truppMemberMap: Record<string, TruppMember[]> = {};
      const truppMemberIdMap: Record<string, string[]> = {};
      for (const tm of (truppMembersRes.data ?? [])) {
        if (!truppMemberMap[tm.trupp_id]) truppMemberMap[tm.trupp_id] = [];
        if (!truppMemberIdMap[tm.trupp_id]) truppMemberIdMap[tm.trupp_id] = [];
        truppMemberMap[tm.trupp_id].push({
          id: tm.user_id,
          name: userMap[tm.user_id]?.name ?? 'Unbekannt',
          avatarUrl: userMap[tm.user_id]?.avatarUrl ?? null,
          role: tm.role as 'leader' | 'member',
          joinedAt: tm.joined_at,
        });
        truppMemberIdMap[tm.trupp_id].push(tm.user_id);
      }

      const meetingAttendeeMap: Record<string, string[]> = {};
      for (const ma of (meetingAttendeesRes.data ?? [])) {
        if (!meetingAttendeeMap[ma.meeting_id]) meetingAttendeeMap[ma.meeting_id] = [];
        meetingAttendeeMap[ma.meeting_id].push(ma.user_id);
      }

      const truppMeetingMap: Record<string, TruppMeeting[]> = {};
      for (const m of (truppMeetingsRes.data ?? [])) {
        if (!truppMeetingMap[m.trupp_id]) truppMeetingMap[m.trupp_id] = [];
        truppMeetingMap[m.trupp_id].push({
          id: m.id, truppId: m.trupp_id, title: m.title, description: m.description ?? '',
          dateTime: m.date_time, location: m.location ?? '', city: m.city ?? '',
          attendeeIds: meetingAttendeeMap[m.id] ?? [],
        });
      }
      setTrupps((truppsRes.data ?? []).map((t: any) =>
        mapDbTrupp(t, truppMemberMap[t.id] ?? [], truppMemberIdMap[t.id] ?? [], truppMeetingMap[t.id] ?? []),
      ));

      const chPartMap: Record<string, string[]> = {};
      for (const cp of (challengeParticipantsRes.data ?? [])) {
        if (!chPartMap[cp.challenge_id]) chPartMap[cp.challenge_id] = [];
        chPartMap[cp.challenge_id].push(cp.user_id);
      }
      const chResultMap: Record<string, ChallengeResult[]> = {};
      for (const cr of (challengeResultsRes.data ?? [])) {
        if (!chResultMap[cr.challenge_id]) chResultMap[cr.challenge_id] = [];
        chResultMap[cr.challenge_id].push({
          userId: cr.user_id, value: cr.value,
          proofUrl: cr.proof_url ?? undefined, submittedAt: cr.submitted_at,
        });
      }
      setChallenges((challengesRes.data ?? []).map((c: any) =>
        mapDbChallenge(c, chPartMap[c.id] ?? [], chResultMap[c.id] ?? []),
      ));

      setWorkoutLogs((workoutLogsRes.data ?? []).map((l: any) => ({
        id: l.id, userId: l.user_id, exercise: l.exercise,
        reps: l.reps ?? undefined, sets: l.sets ?? undefined,
        duration: l.duration ?? undefined, distance: l.distance ?? undefined,
        notes: l.notes ?? '', createdAt: l.created_at,
      })));

      console.log('[KADERSCHMIEDE] Data refreshed');
    } catch (e) {
      console.log('[KADERSCHMIEDE] Refresh error:', e);
    }
    setIsLoading(false);
  }, [user, userId]);

  return {
    activities,
    trupps,
    challenges,
    workoutLogs,
    upcomingActivities,
    activeChallenges,
    activitiesByBundesland,
    selectedSport,
    selectedLevel,
    setSelectedSport,
    setSelectedLevel,
    joinActivity,
    leaveActivity,
    createActivity,
    joinTrupp,
    leaveTrupp,
    joinChallenge,
    addWorkoutLog,
    myTrupps,
    myChallenges,
    totalWorkouts,
    weeklyStreak,
    getTruppById,
    getChallengeById,
    getActivityById,
    createTrupp,
    createChallenge,
    submitChallengeResult,
    attendMeeting,
    leaveMeeting,
    createMeeting,
    getMemberName,
    getMemberAvatar,
    activeCheckIn,
    startCheckIn,
    performCheckIn,
    endCheckIn,
    refreshCheckIn,
    generateCurrentToken,
    isLoading,
    refreshData,
  };
});
