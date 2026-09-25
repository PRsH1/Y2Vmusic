const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const PATH_ID_PREFIXES = ["shorts", "embed", "live"];

export function isValidYouTubeUrl(value: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "youtu.be") {
    return parsed.pathname.split("/").filter(Boolean).length === 1;
  }

  if (!YOUTUBE_HOSTS.has(hostname)) {
    return false;
  }

  if (parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v");
    return Boolean(videoId && videoId.trim().length > 0);
  }

  const [firstSegment, secondSegment] = parsed.pathname
    .split("/")
    .filter(Boolean);

  if (PATH_ID_PREFIXES.includes(firstSegment ?? "")) {
    return Boolean(secondSegment && secondSegment.trim().length > 0);
  }

  return false;
}

/**
 * Extracts the canonical 11-character video ID from a YouTube URL.
 *
 * Parses the URL structurally instead of substring matching, so a crafted
 * query such as `?xv=<id>&v=<real id>` cannot smuggle in the wrong ID.
 * Returns null when the URL carries no well-formed video ID.
 */
export function extractVideoId(value: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "youtu.be") {
    const [videoId] = parsed.pathname.split("/").filter(Boolean);
    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  if (!YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  if (parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v")?.trim() ?? "";
    return VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  const [firstSegment, secondSegment] = parsed.pathname
    .split("/")
    .filter(Boolean);

  if (PATH_ID_PREFIXES.includes(firstSegment ?? "")) {
    return secondSegment && VIDEO_ID_PATTERN.test(secondSegment)
      ? secondSegment
      : null;
  }

  return null;
}
