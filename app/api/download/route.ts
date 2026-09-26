import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import {
  BusyError,
  downloadAdmission,
  type Slot,
} from "@/lib/admission";
import { convert, type AudioFormat } from "@/lib/ffmpeg";
import {
  clearJob,
  isValidJobId,
  markJob,
  updateJobProgress,
} from "@/lib/job-registry";
import { parseTrackMetadata } from "@/lib/metadata";
import { getCachedInfo, setCachedInfo } from "@/lib/info-cache";
import { getCliErrorMessage } from "@/lib/process";
import {
  cleanupJob,
  createJobDir,
  createTempPath,
  NoOutputFileError,
  resolveDownloadedFile,
  sweepStaleJobs,
} from "@/lib/temp";
import {
  buildThumbnailCandidates,
  downloadFirstThumbnail,
} from "@/lib/thumbnail";
import { extractVideoId, isValidYouTubeUrl } from "@/lib/validate";
import {
  downloadAudio,
  getVideoInfo,
  isFilterRejection,
  MAX_DURATION_SECONDS,
  MAX_FILESIZE,
} from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

type Quality = "best" | "high" | "medium";

type DownloadRequest = {
  url?: unknown;
  format?: unknown;
  quality?: unknown;
  title?: unknown;
  channel?: unknown;
  jobId?: unknown;
  duration?: unknown;
};

type DownloadInfo = {
  title: string;
  channel: string;
  /** Seconds. Only used to turn ffmpeg's elapsed time into a percentage. */
  duration: number | null;
};

const AUDIO_FORMATS = new Set<AudioFormat>(["mp3", "m4a", "opus", "flac"]);
const QUALITIES = new Set<Quality>(["best", "high", "medium"]);

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isAudioFormat(value: unknown): value is AudioFormat {
  return typeof value === "string" && AUDIO_FORMATS.has(value as AudioFormat);
}

function isQuality(value: unknown): value is Quality {
  return typeof value === "string" && QUALITIES.has(value as Quality);
}

function getBitrate(format: AudioFormat, quality: Quality): number | undefined {
  if (format === "mp3") {
    return {
      best: 320,
      high: 192,
      medium: 128,
    }[quality];
  }

  if (format === "m4a") {
    return {
      best: 256,
      high: 192,
      medium: 128,
    }[quality];
  }

  return undefined;
}

function sanitizeFileName(title: string): string {
  const sanitized = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return sanitized || "audio";
}

function contentDisposition(fileName: string): string {
  const fallback = fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "")
    .trim();

  return `attachment; filename="${fallback || "audio"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function getContentType(ext: string): string {
  const normalized = ext.toLowerCase();

  if (normalized === "mp3") {
    return "audio/mpeg";
  }

  if (normalized === "m4a") {
    return "audio/mp4";
  }

  if (normalized === "flac") {
    return "audio/flac";
  }

  if (normalized === "webm") {
    return "audio/webm";
  }

  if (normalized === "opus") {
    return "audio/ogg";
  }

  return "application/octet-stream";
}

/**
 * Maps a failed extraction to something a listener can act on. yt-dlp's raw
 * stderr is kept as the fallback, but the paths we deliberately refuse get a
 * plain explanation instead.
 */
function toUserMessage(error: unknown): string {
  if (isFilterRejection(error)) {
    return "라이브 방송이거나 3시간을 넘는 영상은 추출할 수 없습니다.";
  }

  if (error instanceof NoOutputFileError) {
    return `추출된 파일이 없습니다. 파일이 최대 크기(${MAX_FILESIZE})를 넘었을 수 있습니다.`;
  }

  return `다운로드를 처리하지 못했습니다. ${getCliErrorMessage(error)}`;
}

/**
 * Tags for a request that did not send its own. `channel` carries the artist
 * from here on — the uploader channel is usually a label, so it is parsed out
 * of the video title the same way the client prefills its fields.
 */
function toTags(
  rawTitle: string,
  rawChannel: string,
  duration: number | null,
): DownloadInfo {
  const parsed = parseTrackMetadata(rawTitle, rawChannel);
  return { title: parsed.title, channel: parsed.artist, duration };
}

async function getDownloadInfo(
  url: string,
  videoId: string | null,
  provided: DownloadInfo | null,
): Promise<DownloadInfo> {
  if (provided) {
    return provided;
  }

  if (videoId) {
    const cached = getCachedInfo(videoId);

    if (cached) {
      return toTags(cached.title, cached.channel, cached.duration);
    }
  }

  const info = await getVideoInfo(url);

  if (videoId) {
    setCachedInfo(videoId, info);
  }

  return toTags(info.title, info.channel, info.duration);
}

export async function POST(request: Request) {
  let jobDir: string | undefined;
  let slot: Slot | undefined;
  let jobId: string | undefined;
  let body: DownloadRequest;

  try {
    body = (await request.json()) as DownloadRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  try {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const format = isAudioFormat(body.format) ? body.format : null;
    const quality = isQuality(body.quality) ? body.quality : "best";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    // Client-supplied, so bounded; a bad value only mislabels the progress bar.
    const duration =
      typeof body.duration === "number" &&
      Number.isFinite(body.duration) &&
      body.duration > 0 &&
      body.duration <= MAX_DURATION_SECONDS
        ? body.duration
        : null;

    if (!isValidYouTubeUrl(url)) {
      return jsonError("지원하는 YouTube 영상 URL을 입력하세요.", 400);
    }

    if (!format) {
      return jsonError("지원하는 오디오 포맷을 선택하세요.", 400);
    }

    jobId = isValidJobId(body.jobId) ? body.jobId : undefined;

    // Marked before acquiring so a client polling /api/status sees "queued"
    // for the whole time it spends waiting for the slot.
    if (jobId) {
      markJob(jobId, "queued");
    }

    // Held only until the file exists. Transfer is cheap and a slow client
    // must not keep the next extraction waiting, so the slot is released
    // before the streaming response is returned.
    slot = await downloadAdmission.acquire();

    if (jobId) {
      markJob(jobId, "running");
    }

    const videoId = extractVideoId(url);
    const info = await getDownloadInfo(
      url,
      videoId,
      title && channel ? { title, channel, duration } : null,
    );
    // Clears anything a crashed process left behind; a restart is not
    // guaranteed to happen between long-lived downloads.
    const swept = sweepStaleJobs();

    if (swept > 0) {
      console.info(`[temp] swept ${swept} stale job(s)`);
    }

    // The job directory is created before yt-dlp runs so a failed download
    // still has its partial files cleaned up in the catch below.
    jobDir = createJobDir();
    const templatePath = path.join(jobDir, "source.%(ext)s");

    await downloadAudio(url, templatePath, (fraction) => {
      if (jobId) {
        updateJobProgress(jobId, "downloading", fraction);
      }
    });
    const inputPath = resolveDownloadedFile(templatePath);

    let responsePath = inputPath;

    if (format !== "opus") {
      // Album art comes from a server-built URL, never from the request body.
      const thumbnailPath = videoId
        ? await downloadFirstThumbnail(jobDir, buildThumbnailCandidates(videoId))
        : null;

      const outputPath = createTempPath(jobDir, format);
      if (jobId) {
        // Percent stays null when the length is unknown; the bar shows that
        // honestly as indeterminate instead of guessing.
        updateJobProgress(jobId, "converting", info.duration ? 0 : null);
      }

      await convert(inputPath, outputPath, {
        durationSeconds: info.duration,
        onProgress: (fraction) => {
          if (jobId) {
            updateJobProgress(jobId, "converting", fraction);
          }
        },
        format,
        bitrate: getBitrate(format, quality),
        metadata: {
          title: info.title,
          artist: info.channel,
          thumbnailPath: thumbnailPath ?? undefined,
        },
      });
      responsePath = outputPath;
    }

    const responseExt =
      format === "opus"
        ? path.extname(responsePath).replace(".", "") || "opus"
        : format;
    // "Artist - Title" so a folder of downloads sorts and reads like a library.
    const fileName = `${sanitizeFileName(
      info.channel ? `${info.channel} - ${info.title}` : info.title,
    )}.${responseExt}`;
    const stats = statSync(responsePath);
    const nodeStream = createReadStream(responsePath);
    const finishedJobDir = jobDir;
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      cleanupJob(finishedJobDir);
    };

    nodeStream.on("close", cleanup);
    nodeStream.on("error", cleanup);

    return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": contentDisposition(fileName),
        "Content-Length": String(stats.size),
        "Content-Type": getContentType(responseExt),
      },
    });
  } catch (error) {
    cleanupJob(jobDir);

    if (error instanceof BusyError) {
      return Response.json(
        { error: error.message },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    return jsonError(toUserMessage(error), 500);
  } finally {
    slot?.release();
    clearJob(jobId);
  }
}
