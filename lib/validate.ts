const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

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

  if (["shorts", "embed", "live"].includes(firstSegment ?? "")) {
    return Boolean(secondSegment && secondSegment.trim().length > 0);
  }

  return false;
}
