type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

export async function cachedSessionJsonRequest<T>(
  namespace: string,
  url: string,
  ttlMs: number,
  errorMessage: string,
): Promise<T> {
  const key = `${namespace}:${url}`;
  const cached = readCache<T>(key);
  if (cached !== undefined) return cached;

  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(errorMessage);
      const value = (await response.json()) as T;
      writeCache(key, value, ttlMs);
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
}

function readCache<T>(key: string): T | undefined {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry.value;
  if (memoryEntry) memoryCache.delete(key);

  try {
    const raw = window.sessionStorage.getItem(sessionKey(key));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(sessionKey(key));
      return undefined;
    }
    memoryCache.set(key, entry as CacheEntry<unknown>);
    return entry.value;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number) {
  const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
  memoryCache.set(key, entry as CacheEntry<unknown>);

  try {
    window.sessionStorage.setItem(sessionKey(key), JSON.stringify(entry));
  } catch {
    // Memory cache remains available when browser storage is restricted.
  }
}

function sessionKey(key: string) {
  return `ponpon:picker-cache:${key}`;
}
