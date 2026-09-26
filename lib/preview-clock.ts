/**
 * Where each preview player currently is, keyed by video id.
 *
 * The preview lives in the track list and the trim controls live in the
 * download panel; they never share a parent that owns playback state. This is
 * the smallest bridge: the player writes, the panel subscribes. The last
 * position is kept after the preview closes, so "listen, close, mark" works.
 */

const times = new Map<string, number>();
const listeners = new Set<() => void>();
/** Below this, a new reading is not worth re-rendering for. */
const MIN_STEP_SECONDS = 0.2;

export function setPreviewTime(videoId: string, seconds: number): void {
  const previous = times.get(videoId);

  if (previous !== undefined && Math.abs(previous - seconds) < MIN_STEP_SECONDS) {
    return;
  }

  times.set(videoId, seconds);
  listeners.forEach((listener) => listener());
}

export function getPreviewTime(videoId: string): number | null {
  return times.get(videoId) ?? null;
}

export function subscribePreviewTime(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
