import { runCli } from "@/lib/process";

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

export async function downloadAudio(
  url: string,
  outputPath: string,
): Promise<void> {
  await runCli(
    "yt-dlp",
    [
      "-f",
      "bestaudio",
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
