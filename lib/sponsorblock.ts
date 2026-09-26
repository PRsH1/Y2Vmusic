import { createHash } from "node:crypto";

/**
 * Non-music intros and outros for a video, from SponsorBlock.
 *
 * SponsorBlock is a community database of tagged video sections, and its
 * "music_offtopic" category exists for exactly this: the skits, talking and
 * credits that music videos wrap around the song. It only prefills a
 * suggestion — community data is sometimes wrong, and a wrong cut applied
 * silently would remove real music without anyone noticing.
 *
 * Queried by hash prefix (the k-anonymity endpoint), so the server sends four
 * hex characters rather than the video id itself.
 */

const API = "https://sponsor.ajay.app/api/skipSegments";
const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
/** A segment this close to either end counts as the intro or the outro. */
const EDGE_SECONDS = 1.5;
/** Sections shorter than this are not worth offering to cut. */
const MIN_SECTION_SECONDS = 1;

export type TrimSuggestion = {
  /** Suggested start: where the leading non-music section ends. */
  start: number | null;
  /** Suggested end: where the trailing non-music section begins. */
  end: number | null;
  /** Sections in the middle. Reported, never cut — see the panel. */
  middle: number;
};

type Segment = { segment?: [number, number]; category?: string; videoDuration?: number };
type HashEntry = { videoID?: string; segments?: Segment[] };

const EMPTY: TrimSuggestion = { start: null, end: null, middle: 0 };
const cache = new Map<string, { value: TrimSuggestion; at: number }>();

export function suggestTrim(segments: Array<[number, number]>, duration: number | null): TrimSuggestion {
  let start: number | null = null;
  let end: number | null = null;
  let middle = 0;

  for (const [from, to] of segments) {
    if (from <= EDGE_SECONDS) {
      start = Math.max(start ?? 0, to);
    } else if (duration && to >= duration - EDGE_SECONDS) {
      end = end === null ? from : Math.min(end, from);
    } else {
      middle += 1;
    }
  }

  // A sub-second "intro" is a tagging artifact (seen on live chart data as
  // 0.27s and 0.34s); suggesting a cut to 0:00 would just be noise.
  if (start !== null && start < MIN_SECTION_SECONDS) {
    start = null;
  }

  if (end !== null && duration && duration - end < MIN_SECTION_SECONDS) {
    end = null;
  }

  // Overlapping community tags could leave nothing to keep.
  if (start !== null && end !== null && end - start < 1) {
    return EMPTY;
  }

  return { start, end, middle };
}

export async function fetchTrimSuggestion(videoId: string): Promise<TrimSuggestion> {
  const hit = cache.get(videoId);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.value;
  }

  const prefix = createHash("sha256").update(videoId).digest("hex").slice(0, 4);
  const url = `${API}/${prefix}?categories=${encodeURIComponent('["music_offtopic"]')}`;
  let value = EMPTY;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    // 404 is SponsorBlock's "nothing tagged", not an error.
    if (response.ok) {
      const entries = (await response.json()) as HashEntry[];
      const mine = entries.find((entry) => entry.videoID === videoId)?.segments ?? [];
      const ranges = mine
        .filter((s) => s.category === "music_offtopic" && Array.isArray(s.segment))
        .map((s) => s.segment as [number, number]);
      value = suggestTrim(ranges, mine[0]?.videoDuration || null);
    }
  } catch {
    // Unreachable or slow: the panel simply offers no suggestion.
    return EMPTY;
  }

  cache.set(videoId, { value, at: Date.now() });
  return value;
}
