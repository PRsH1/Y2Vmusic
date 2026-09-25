import { writeFile } from "node:fs/promises";
import { createTempPath } from "@/lib/temp";

const ALLOWED_HOSTS = new Set(["i.ytimg.com"]);
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

/**
 * Album art candidates for a video, highest resolution first.
 *
 * Built server-side from the video ID so no client-supplied URL is ever
 * fetched. maxresdefault is absent for many videos, hence the fallback.
 */
export function buildThumbnailCandidates(videoId: string): string[] {
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

function isAllowedThumbnailUrl(value: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return (
    parsed.protocol === "https:" &&
    parsed.port === "" &&
    ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())
  );
}

async function readCapped(response: Response): Promise<Buffer | null> {
  const declared = Number(response.headers.get("Content-Length") ?? "");

  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return null;
  }

  const body = response.body;

  if (!body) {
    return null;
  }

  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      received += value.byteLength;

      if (received > MAX_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

/**
 * Downloads one album art candidate. Returns the temp file path, or null when
 * the URL is not an allowed thumbnail host, the response fails, or the body
 * exceeds the size cap. Rejections are logged so a too-strict allowlist shows
 * up in the logs instead of silently shipping audio without cover art.
 */
export async function downloadThumbnail(
  jobDir: string,
  url: string,
): Promise<string | null> {
  if (!isAllowedThumbnailUrl(url)) {
    console.warn(`[thumbnail] rejected non-allowlisted URL: ${url}`);
    return null;
  }

  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const buffer = await readCapped(response);

    if (!buffer || buffer.byteLength === 0) {
      console.warn(`[thumbnail] discarded oversized or empty body: ${url}`);
      return null;
    }

    const tempPath = createTempPath(jobDir, "jpg");
    await writeFile(tempPath, buffer);
    return tempPath;
  } catch (error) {
    console.warn(
      `[thumbnail] fetch failed: ${url} — ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return null;
  }
}

/**
 * Tries each candidate in order and returns the first one that downloads.
 */
export async function downloadFirstThumbnail(
  jobDir: string,
  urls: string[],
): Promise<string | null> {
  for (const url of urls) {
    const tempPath = await downloadThumbnail(jobDir, url);

    if (tempPath) {
      return tempPath;
    }
  }

  return null;
}
