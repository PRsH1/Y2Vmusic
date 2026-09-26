import type { ChartTrack } from "@/lib/youtube-api";

const TTL = 2 * 60 * 60 * 1000;
/** How long an expired entry is still worth serving when YouTube is failing. */
const STALE_TTL = 24 * 60 * 60 * 1000;

type CacheEntry = {
  tracks: ChartTrack[];
  timestamp: number;
};

export type CacheHit = {
  tracks: ChartTrack[];
  /** When this snapshot was actually fetched, not when it was served. */
  cachedAt: number;
  stale: boolean;
};

const cache = new Map<string, CacheEntry>();

/**
 * Returns a fresh entry, or null when the caller should refetch.
 *
 * Expired entries are kept rather than deleted — see `getStale`. Weekly charts
 * move slowly, and the WARP proxy this server depends on fails intermittently,
 * so a two-hour-old list beats an error page.
 */
export function getCached(playlistId: string): CacheHit | null {
  const entry = cache.get(playlistId);

  if (!entry || Date.now() - entry.timestamp > TTL) {
    return null;
  }

  return { tracks: entry.tracks, cachedAt: entry.timestamp, stale: false };
}

/**
 * The last successful snapshot, expired but not yet ancient. Only for the
 * path where a refetch has already failed.
 */
export function getStale(playlistId: string): CacheHit | null {
  const entry = cache.get(playlistId);

  if (!entry || Date.now() - entry.timestamp > STALE_TTL) {
    return null;
  }

  return { tracks: entry.tracks, cachedAt: entry.timestamp, stale: true };
}

export function setCache(playlistId: string, tracks: ChartTrack[]): void {
  cache.set(playlistId, {
    tracks,
    timestamp: Date.now(),
  });
}
