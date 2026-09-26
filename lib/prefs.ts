/**
 * Remembers the format and quality the listener last picked.
 *
 * Every download started from MP3/최고 regardless of what was chosen the time
 * before, which is pure friction for a single-user app. Stored per browser,
 * like the theme; nothing here needs to reach the server.
 */

const FORMAT_KEY = "y2v.format";
const QUALITY_KEY = "y2v.quality";

const FORMATS = ["mp3", "m4a", "opus", "flac"] as const;
const QUALITIES = ["best", "high", "medium"] as const;

export type StoredFormat = (typeof FORMATS)[number];
export type StoredQuality = (typeof QUALITIES)[number];

function read<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const value = localStorage.getItem(key);
    return value && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : null;
  } catch {
    // Private mode or blocked storage. A default is fine.
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembering the choice is not worth failing a download over.
  }
}

export function readFormat(): StoredFormat | null {
  return read(FORMAT_KEY, FORMATS);
}

export function readQuality(): StoredQuality | null {
  return read(QUALITY_KEY, QUALITIES);
}

export function writeFormat(value: StoredFormat): void {
  write(FORMAT_KEY, value);
}

export function writeQuality(value: StoredQuality): void {
  write(QUALITY_KEY, value);
}
