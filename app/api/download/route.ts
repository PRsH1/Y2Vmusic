import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { convert, type AudioFormat } from "@/lib/ffmpeg";
import { getCliErrorMessage } from "@/lib/process";
import {
  cleanupMany,
  createTempPath,
  resolveDownloadedFile,
} from "@/lib/temp";
import { downloadThumbnail } from "@/lib/thumbnail";
import { isValidYouTubeUrl } from "@/lib/validate";
import { downloadAudio, getVideoInfo } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 3600;

type Quality = "best" | "high" | "medium";

type DownloadRequest = {
  url?: unknown;
  format?: unknown;
  quality?: unknown;
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

export async function POST(request: Request) {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let thumbnailPath: string | null = null;
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

    if (!isValidYouTubeUrl(url)) {
      return jsonError("지원하는 YouTube 영상 URL을 입력하세요.", 400);
    }

    if (!format) {
      return jsonError("지원하는 오디오 포맷을 선택하세요.", 400);
    }

    const info = await getVideoInfo(url);
    const templatePath = createTempPath("%(ext)s");

    await downloadAudio(url, templatePath);
    inputPath = resolveDownloadedFile(templatePath);

    let responsePath = inputPath;

    if (format !== "opus") {
      // Download thumbnail for album art embedding
      if (info.thumbnail) {
        thumbnailPath = await downloadThumbnail(info.thumbnail);
      }

      outputPath = createTempPath(format);
      await convert(inputPath, outputPath, {
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
    const fileName = `${sanitizeFileName(info.title)}.${responseExt}`;
    const stats = statSync(responsePath);
    const nodeStream = createReadStream(responsePath);
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      cleanupMany([inputPath, outputPath, thumbnailPath]);
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
    cleanupMany([inputPath, outputPath, thumbnailPath]);
    return jsonError(`다운로드를 처리하지 못했습니다. ${getCliErrorMessage(error)}`, 500);
  }
}
