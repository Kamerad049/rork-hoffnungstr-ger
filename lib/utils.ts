import { getCachedUser } from '@/lib/userCache';
import type { SocialUser } from '@/constants/types';

export function getUserById(id: string): SocialUser | undefined {
  const cached = getCachedUser(id) as SocialUser | undefined;
  if (cached) return cached;
  return undefined;
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  return new Date(dateStr).toLocaleDateString('de-DE');
}

export function cleanPanHandlers(panHandlers: object): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(panHandlers)) {
    if (key && key.length > 0 && typeof value === 'function') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function formatReelCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}
