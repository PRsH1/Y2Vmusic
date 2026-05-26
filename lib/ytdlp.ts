import { runCli } from "@/lib/process";
import type { ChartTrack } from "@/lib/youtube-api";

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
  const { stdout } = await runCli(
    "yt-dlp",
    ["--dump-json", "--no-playlist", url],
    {
      maxStdoutBytes: 64 * 1024 * 1024,
    },
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
  const { stdout } = await runCli(
    "yt-dlp",
    ["ytsearch20:" + query, "--dump-json", "--flat-playlist", "--no-download"],
    {
      maxStdoutBytes: 8 * 1024 * 1024,
    },
  );

  return mapTracks(parseJsonLines(stdout));
}

export async function fetchPlaylistFromYtDlp(
  playlistId: string,
): Promise<ChartTrack[]> {
  if (!playlistId.startsWith("RDCLAK5uy_")) {
    throw new Error("지원하지 않는 YouTube Music 플레이리스트입니다.");
  }

  const { stdout } = await runCli(
    "yt-dlp",
    [
      `https://www.youtube.com/playlist?list=${playlistId}`,
      "--dump-json",
      "--flat-playlist",
      "--no-download",
    ],
    {
      maxStdoutBytes: 16 * 1024 * 1024,
    },
  );

  return mapTracks(parseJsonLines(stdout));
}

export async function downloadAudio(
  url: string,
  outputPath: string,
): Promise<void> {
  await runCli(
    "yt-dlp",
    [
      "-f",
      "bestaudio/bestaudio*/best",
      "--no-playlist",
      "--no-progress",
      "-o",
      outputPath,
      url,
    ],
    {
      maxStdoutBytes: 8 * 1024 * 1024,
      maxStderrBytes: 8 * 1024 * 1024,
    },
  );
}
