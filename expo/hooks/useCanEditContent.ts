import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useModeration } from '@/providers/ModerationProvider';

export function useCanEditContent(): boolean {
  const { user } = useAuth();
  const { isModerator, hasPermission } = useModeration();

  return useMemo(() => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (isModerator(user.id) && hasPermission(user.id, 'editPosts')) return true;
    return false;
  }, [user, isModerator, hasPermission]);
}
