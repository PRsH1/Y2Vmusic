import { copyFile } from "node:fs/promises";
import { createLineSplitter, runCli } from "@/lib/process";

/** Conversion budget. A 3-hour FLAC on one core is the worst legitimate case. */
const CONVERT_TIMEOUT_MS = 15 * 60_000;

/**
 * Maps the thumbnail in as embedded cover art, center-cropped to a square.
 *
 * YouTube thumbnails are 16:9 (maxresdefault is 1280x720) while music players
 * show cover art square, so an uncropped frame gets letterboxed or trimmed at
 * the edges there. Cropping to the shorter side keeps the middle, which is
 * where the artist usually is; min() also covers portrait thumbnails.
 */
const COVER_ART_ARGS = [
  "-map", "0:a",
  "-map", "1:v",
  "-filter:v", "crop='min(iw,ih)':'min(iw,ih)'",
  "-c:v", "mjpeg",
  "-disposition:v:0", "attached_pic",
];

export type AudioFormat = "mp3" | "m4a" | "opus" | "flac";

export type ConvertOptions = {
  format: AudioFormat;
  bitrate?: number;
  metadata?: {
    title?: string;
    artist?: string;
    thumbnailPath?: string;
  };
  /** Source length, needed to turn ffmpeg's elapsed time into a fraction. */
  durationSeconds?: number | null;
  onProgress?: (fraction: number) => void;
};

export async function convert(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions,
): Promise<void> {
  if (options.format === "opus") {
    if (inputPath !== outputPath) {
      await copyFile(inputPath, outputPath);
    }
    return;
  }

  // -progress writes key=value lines to stdout; -nostats drops the human
  // status line from stderr, which would otherwise duplicate it.
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-progress",
    "pipe:1",
    "-nostats",
    "-i",
    inputPath,
  ];

  // Add thumbnail as input if available (for album art embedding)
  if (options.metadata?.thumbnailPath) {
    args.push("-i", options.metadata.thumbnailPath);
  }

  // Strip video streams from audio input
  args.push("-vn");

  if (options.format === "mp3") {
    args.push("-b:a", `${options.bitrate ?? 320}k`);

    // Embed album art for MP3
    if (options.metadata?.thumbnailPath) {
      // Re-enable video for the cover image, map audio from input 0, video from input 1
      args.splice(args.indexOf("-vn"), 1);
      args.push(...COVER_ART_ARGS);
    }

    // Metadata tags
    if (options.metadata?.title) {
      args.push("-metadata", `title=${options.metadata.title}`);
    }
    if (options.metadata?.artist) {
      args.push("-metadata", `artist=${options.metadata.artist}`);
    }

    args.push("-id3v2_version", "3", outputPath);
  }

  if (options.format === "m4a") {
    args.push("-c:a", "aac", "-b:a", `${options.bitrate ?? 256}k`);

    // Embed album art for M4A
    if (options.metadata?.thumbnailPath) {
      args.splice(args.indexOf("-vn"), 1);
      args.push(...COVER_ART_ARGS);
    }

    if (options.metadata?.title) {
      args.push("-metadata", `title=${options.metadata.title}`);
    }
    if (options.metadata?.artist) {
      args.push("-metadata", `artist=${options.metadata.artist}`);
    }

    args.push(outputPath);
  }

  if (options.format === "flac") {
    args.push("-c:a", "flac");

    // FLAC supports embedded pictures via -metadata_block_picture but simpler to use mapped cover
    if (options.metadata?.thumbnailPath) {
      args.splice(args.indexOf("-vn"), 1);
      args.push(...COVER_ART_ARGS);
    }

    if (options.metadata?.title) {
      args.push("-metadata", `title=${options.metadata.title}`);
    }
    if (options.metadata?.artist) {
      args.push("-metadata", `artist=${options.metadata.artist}`);
    }

    args.push(outputPath);
  }

  const totalUs = (options.durationSeconds ?? 0) * 1_000_000;
  const readProgress = createLineSplitter((line) => {
    // "out_time_us=N/A" appears before the first frame is written.
    const match = /^out_time_us=(\d+)$/.exec(line);

    if (match && totalUs > 0) {
      options.onProgress?.(Math.min(1, Number(match[1]) / totalUs));
    }
  });

  await runCli("ffmpeg", args, {
    // -progress output accumulates here too; a long FLAC can reach hundreds
    // of KB of it, which the old 1MB cap sat uncomfortably close to.
    maxStdoutBytes: 8 * 1024 * 1024,
    onStdout: readProgress,
    maxStderrBytes: 8 * 1024 * 1024,
    timeoutMs: CONVERT_TIMEOUT_MS,
  });
}
