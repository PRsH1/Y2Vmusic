import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const TEMP_DIR = path.join(process.cwd(), "temp");

function ensureTempDir(): void {
  mkdirSync(TEMP_DIR, { recursive: true });
}

export function createTempPath(ext: string): string {
  ensureTempDir();
  const normalizedExt = ext.startsWith(".") ? ext.slice(1) : ext;
  return path.join(TEMP_DIR, `${randomUUID()}.${normalizedExt}`);
}

export function resolveDownloadedFile(templatePath: string): string {
  const directory = path.dirname(templatePath);
  const basename = path.basename(templatePath);
  const prefix = basename.endsWith(".%(ext)s")
    ? basename.slice(0, -"%(ext)s".length)
    : `${path.parse(basename).name}.`;

  const matches = readdirSync(directory)
    .filter((fileName) => fileName.startsWith(prefix) && fileName !== basename)
    .map((fileName) => path.join(directory, fileName))
    .filter((filePath) => existsSync(filePath))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (matches.length === 0) {
    throw new Error("다운로드된 임시 파일을 찾을 수 없습니다.");
  }

  return matches[0];
}

export function cleanup(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  } catch {
    // Cleanup failure should not break a completed response.
  }
}

export function cleanupMany(paths: Array<string | null | undefined>): void {
  for (const filePath of paths) {
    if (filePath) {
      cleanup(filePath);
    }
  }
}
