import { copyFile } from "node:fs/promises";
import { runCli } from "@/lib/process";

export type AudioFormat = "mp3" | "m4a" | "opus" | "flac";

export type ConvertOptions = {
  format: AudioFormat;
  bitrate?: number;
  metadata?: {
    title?: string;
    artist?: string;
    thumbnailPath?: string;
  };
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

  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath];

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
      args.push(
        "-map", "0:a",
        "-map", "1:v",
        "-c:v", "mjpeg",
        "-disposition:v:0", "attached_pic",
      );
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
      args.push(
        "-map", "0:a",
        "-map", "1:v",
        "-c:v", "mjpeg",
        "-disposition:v:0", "attached_pic",
      );
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
      args.push(
        "-map", "0:a",
        "-map", "1:v",
        "-c:v", "mjpeg",
        "-disposition:v:0", "attached_pic",
      );
    }

    if (options.metadata?.title) {
      args.push("-metadata", `title=${options.metadata.title}`);
    }
    if (options.metadata?.artist) {
      args.push("-metadata", `artist=${options.metadata.artist}`);
    }

    args.push(outputPath);
  }

  await runCli("ffmpeg", args, {
    maxStdoutBytes: 1024 * 1024,
    maxStderrBytes: 8 * 1024 * 1024,
  });
}
