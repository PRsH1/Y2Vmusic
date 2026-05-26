import type { VideoInfo } from "@/lib/ytdlp";

const TTL = 10 * 60 * 1000;

type CacheEntry = {
  info: VideoInfo;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

export function getCachedInfo(videoId: string): VideoInfo | null {
  const entry = cache.get(videoId);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(videoId);
    return null;
  }

  return entry.info;
}

export function setCachedInfo(videoId: string, info: VideoInfo): void {
  cache.set(videoId, {
    info,
    timestamp: Date.now(),
  });
}
