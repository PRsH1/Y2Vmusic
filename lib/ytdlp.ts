import { CliError, createLineSplitter, runCli } from "@/lib/process";
import type { ChartTrack } from "@/lib/youtube-api";

/**
 * Wall-clock budgets. Metadata lookups are network-bound and should never take
 * this long; the download budget has to cover a 3-hour track on one core.
 * A timeout is not retried — `withRetry` only retries HTTP 429 — so these are
 * per-command, not per-attempt totals.
 */
const METADATA_TIMEOUT_MS = 90_000;
const PLAYLIST_TIMEOUT_MS = 120_000;
const DOWNLOAD_TIMEOUT_MS = 15 * 60_000;

export type AudioStreamInfo = {
  id: string;
  codec: string;
  bitrate: number | null;
  ext: string;
};

export type VideoInfo = {
  title: string;
  channel: string;
  duration: number | null;
  thumbnail: string | null;
  formats: AudioStreamInfo[];
};

type RawYtDlpFormat = {
  format_id?: string;
  acodec?: string;
  vcodec?: string;
  abr?: number;
  tbr?: number;
  ext?: string;
};

type RawYtDlpInfo = {
  title?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  formats?: RawYtDlpFormat[];
};

type RawYtDlpTrack = {
  id?: string;
  url?: string;
  title?: string;
  channel?: string;
  uploader?: string;
  thumbnail?: string;
  duration?: number;
};

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 3000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error instanceof CliError &&
        error.stderr?.includes("HTTP Error 429");

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, baseDelayMs * Math.pow(3, attempt));
      });
    }
  }

  throw lastError;
}

function normalizeCodec(codec: string | undefined): string {
  if (!codec || codec === "none") {
    return "unknown";
  }

  const lower = codec.toLowerCase();

  if (lower.includes("opus")) {
    return "opus";
  }

  if (lower.includes("mp4a") || lower.includes("aac")) {
    return "aac";
  }

  if (lower.includes("vorbis")) {
    return "vorbis";
  }

  return lower.split(".")[0] || lower;
}

function toBitrate(format: RawYtDlpFormat): number | null {
  const bitrate = format.abr ?? format.tbr;
  return typeof bitrate === "number" && Number.isFinite(bitrate)
    ? Math.round(bitrate)
    : null;
}

function mapAudioFormats(formats: RawYtDlpFormat[] | undefined): AudioStreamInfo[] {
  const seen = new Set<string>();

  return (formats ?? [])
    .filter((format) => {
      return (
        format.format_id &&
        format.acodec &&
        format.acodec !== "none" &&
        (!format.vcodec || format.vcodec === "none")
      );
    })
    .map((format) => ({
      id: format.format_id ?? "unknown",
      codec: normalizeCodec(format.acodec),
      bitrate: toBitrate(format),
      ext: format.ext ?? "unknown",
    }))
    .filter((format) => {
      const key = `${format.id}:${format.ext}:${format.codec}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
}

function formatSecondsToMMSS(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, "0")))
      .join(":");
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function extractVideoId(raw: RawYtDlpTrack): string {
  if (raw.id) {
    return raw.id;
  }

  return raw.url?.match(/v=([^&]+)/)?.[1] ?? "";
}

function parseJsonLines(stdout: string): RawYtDlpTrack[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RawYtDlpTrack);
}

function mapTracks(rawTracks: RawYtDlpTrack[]): ChartTrack[] {
  return rawTracks
    .map((raw, index) => {
      const videoId = extractVideoId(raw);

      return {
        rank: index + 1,
        videoId,
        title: raw.title?.trim() || "제목 없음",
        channel: raw.channel?.trim() || raw.uploader?.trim() || "알 수 없음",
        thumbnail:
          raw.thumbnail ?? (videoId ? `https://i.ytimg.com/vi/${videoId}/default.jpg` : null),
        duration: raw.duration ? formatSecondsToMMSS(raw.duration) : null,
      };
    })
    .filter((track) => track.videoId);
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await withRetry(() =>
    runCli(
      "yt-dlp",
      ["--dump-json", "--no-playlist", url],
      {
        maxStdoutBytes: 64 * 1024 * 1024,
        timeoutMs: METADATA_TIMEOUT_MS,
      },
    ),
  );

  const raw = JSON.parse(stdout) as RawYtDlpInfo;

  return {
    title: raw.title?.trim() || "제목 없음",
    channel: raw.channel?.trim() || raw.uploader?.trim() || "알 수 없는 채널",
    duration: typeof raw.duration === "number" ? raw.duration : null,
    thumbnail: raw.thumbnail ?? null,
    formats: mapAudioFormats(raw.formats),
  };
}

export async function searchYouTube(query: string): Promise<ChartTrack[]> {
  const { stdout } = await withRetry(() =>
    runCli(
      "yt-dlp",
      ["ytsearch20:" + query, "--dump-json", "--flat-playlist", "--no-download"],
      {
        maxStdoutBytes: 8 * 1024 * 1024,
        timeoutMs: METADATA_TIMEOUT_MS,
      },
    ),
  );

  return mapTracks(parseJsonLines(stdout));
}

export async function fetchPlaylistFromYtDlp(
  playlistId: string,
): Promise<ChartTrack[]> {
  if (!playlistId.startsWith("RDCLAK5uy_")) {
    throw new Error("지원하지 않는 YouTube Music 플레이리스트입니다.");
  }

  const { stdout } = await withRetry(() =>
    runCli(
      "yt-dlp",
      [
        `https://www.youtube.com/playlist?list=${playlistId}`,
        "--dump-json",
        "--flat-playlist",
        "--no-download",
      ],
      {
        maxStdoutBytes: 16 * 1024 * 1024,
        timeoutMs: PLAYLIST_TIMEOUT_MS,
      },
    ),
  );

  return mapTracks(parseJsonLines(stdout));
}

const PROGRESS_MARKER = "Y2VPROG";

/**
 * Reads one progress line: "Y2VPROG <downloaded> <total> <estimate>". The total
 * is "NA" for fragmented streams, where only the estimate exists. Returns null
 * for any other line, or when there is nothing to divide by.
 */
export function parseYtDlpProgress(line: string): number | null {
  // String.raw: in a plain template literal "\S" collapses to "S".
  const match = new RegExp(String.raw`${PROGRESS_MARKER} (\S+) (\S+) (\S+)`).exec(line);

  if (!match) {
    return null;
  }

  const downloaded = Number(match[1]);
  const total = Number(match[2]);
  const estimate = Number(match[3]);
  const denominator = total > 0 ? total : estimate > 0 ? estimate : 0;

  if (!Number.isFinite(downloaded) || denominator <= 0) {
    return null;
  }

  return Math.min(1, Math.max(0, downloaded / denominator));
}

export const MAX_DURATION_SECONDS = 3 * 60 * 60;
export const MAX_FILESIZE = "500M";

/**
 * True when yt-dlp refused the video because of the live/duration filter.
 *
 * `--break-match-filters` is used rather than `--match-filter` on purpose:
 * plain `--match-filter` skips the video and still exits 0, leaving no file
 * and no way to tell a rejection apart from a silent failure.
 */
export function isFilterRejection(error: unknown): boolean {
  if (!(error instanceof CliError)) {
    return false;
  }

  // yt-dlp exits 101 when a --break-* option stops the run, and the filter is
  // the only one configured here. The message itself lands on stdout, not
  // stderr, so both streams are checked as a fallback.
  return (
    error.exitCode === 101 ||
    (error.stdout ?? "").includes("does not pass filter") ||
    (error.stderr ?? "").includes("does not pass filter")
  );
}

export async function downloadAudio(
  url: string,
  outputPath: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  // yt-dlp prints progress to stdout even through a pipe once --newline puts
  // each update on its own line; the template makes it machine-readable.
  const readProgress = createLineSplitter((line) => {
    const fraction = parseYtDlpProgress(line);

    if (fraction !== null) {
      onProgress?.(fraction);
    }
  });

  await withRetry(() =>
    runCli(
      "yt-dlp",
      [
        "-f",
        "bestaudio/bestaudio*/best",
        "--no-playlist",
        "--newline",
        "--progress-template",
        `download:${PROGRESS_MARKER} %(progress.downloaded_bytes)s %(progress.total_bytes)s %(progress.total_bytes_estimate)s`,
        "--break-match-filters",
        `!is_live & duration < ${MAX_DURATION_SECONDS}`,
        "--max-filesize",
        MAX_FILESIZE,
        "-o",
        outputPath,
        url,
      ],
      {
        maxStdoutBytes: 8 * 1024 * 1024,
        maxStderrBytes: 8 * 1024 * 1024,
        timeoutMs: DOWNLOAD_TIMEOUT_MS,
        onStdout: readProgress,
      },
    ),
  );
}
