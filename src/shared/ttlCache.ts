/**
 * A small in-memory cache with a time-to-live. `load` also collapses concurrent misses for one key into a
 * single call, so a burst of identical requests costs one database query instead of one each.
 */
export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  clear(): void;
  /** The cached value, or the result of `loader` (shared by every caller that asks while it runs). */
  load(key: string, loader: () => Promise<V>): Promise<V>;
}

export function createTtlCache<V>(opts: {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}): TtlCache<V> {
  const now = opts.now ?? Date.now;
  const maxEntries = opts.maxEntries ?? 1000;
  const store = new Map<string, { value: V; expires: number }>();
  const inflight = new Map<string, Promise<V>>();

  const get = (key: string): V | undefined => {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now()) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  };

  const set = (key: string, value: V): void => {
    if (store.size >= maxEntries && !store.has(key)) {
      const t = now();
      for (const [k, v] of store) if (v.expires <= t) store.delete(k);
      // Still full: drop the oldest entry (Map keeps insertion order).
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
    }
    store.set(key, { value, expires: now() + opts.ttlMs });
  };

  const load = (key: string, loader: () => Promise<V>): Promise<V> => {
    const hit = get(key);
    if (hit !== undefined) return Promise.resolve(hit);
    const running = inflight.get(key);
    if (running) return running;
    const p = loader()
      .then((value) => {
        set(key, value);
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
    return p;
  };

  return {
    get,
    set,
    delete: (key) => {
      store.delete(key);
      inflight.delete(key);
    },
    clear: () => {
      store.clear();
      inflight.clear();
    },
    load,
  };
}
