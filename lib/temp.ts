import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const TEMP_DIR = path.join(process.cwd(), "temp");

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Thrown when yt-dlp exits successfully but produces no file — what happens
 * when a download is skipped rather than failed (for example `--max-filesize`).
 */
export class NoOutputFileError extends Error {
  constructor() {
    super("다운로드된 임시 파일을 찾을 수 없습니다.");
    this.name = "NoOutputFileError";
  }
}

/**
 * Creates an isolated directory for one request's temporary files.
 *
 * Everything a request writes lives inside it, so cleanup is a single
 * recursive delete. That also removes yt-dlp's partial `.part` and fragment
 * files, which a per-file cleanup cannot see when a download fails before
 * the final filename is known.
 */
export function createJobDir(): string {
  const jobDir = path.join(TEMP_DIR, randomUUID());
  mkdirSync(jobDir, { recursive: true });
  return jobDir;
}

export function createTempPath(jobDir: string, ext: string): string {
  const normalizedExt = ext.startsWith(".") ? ext.slice(1) : ext;
  return path.join(jobDir, `${randomUUID()}.${normalizedExt}`);
}

export function resolveDownloadedFile(templatePath: string): string {
  const directory = path.dirname(templatePath);
  const basename = path.basename(templatePath);
  const prefix = basename.endsWith(".%(ext)s")
    ? basename.slice(0, -"%(ext)s".length)
    : `${path.parse(basename).name}.`;

  const matches = readdirSync(directory)
    .filter(
      (fileName) =>
        fileName.startsWith(prefix) &&
        fileName !== basename &&
        !fileName.endsWith(".part"),
    )
    .map((fileName) => path.join(directory, fileName))
    .filter((filePath) => existsSync(filePath))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (matches.length === 0) {
    throw new NoOutputFileError();
  }

  return matches[0];
}

export function cleanupJob(jobDir: string | null | undefined): void {
  if (!jobDir) {
    return;
  }

  try {
    rmSync(jobDir, { recursive: true, force: true });
  } catch {
    // Cleanup failure should not break a completed response.
  }
}

/**
 * Removes job directories (and pre-existing loose files) left behind by a
 * crashed process. Anything younger than the cutoff is kept so an in-flight
 * long download is never swept out from under itself.
 */
export function sweepStaleJobs(maxAgeMs: number = STALE_AFTER_MS): number {
  if (!existsSync(TEMP_DIR)) {
    return 0;
  }

  const now = Date.now();
  let removed = 0;

  let entries: string[];

  try {
    entries = readdirSync(TEMP_DIR);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const target = path.join(TEMP_DIR, entry);

    try {
      if (now - statSync(target).mtimeMs <= maxAgeMs) {
        continue;
      }

      rmSync(target, { recursive: true, force: true });
      removed += 1;
    } catch {
      // A file that vanished or is locked is not worth failing the sweep over.
    }
  }

  return removed;
}
