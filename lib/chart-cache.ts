import type { ChartTrack } from "@/lib/youtube-api";

const TTL = 2 * 60 * 60 * 1000;

type CacheEntry = {
  tracks: ChartTrack[];
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

export function getCached(playlistId: string): ChartTrack[] | null {
  const entry = cache.get(playlistId);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(playlistId);
    return null;
  }

  return entry.tracks;
}

export function setCache(playlistId: string, tracks: ChartTrack[]): void {
  cache.set(playlistId, {
    tracks,
    timestamp: Date.now(),
  });
}
