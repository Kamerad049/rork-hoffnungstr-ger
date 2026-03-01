interface CachedUser {
  id: string;
  [key: string]: any;
}

const cache = new Map<string, CachedUser>();

export function setUserCache(users: CachedUser[]) {
  cache.clear();
  users.forEach((u) => cache.set(u.id, u));
}

export function addToUserCache(user: CachedUser) {
  cache.set(user.id, user);
}

export function getCachedUser(id: string): CachedUser | undefined {
  return cache.get(id);
}

export function getAllCachedUsers(): CachedUser[] {
  return Array.from(cache.values());
}

export function clearUserCache() {
  cache.clear();
}
