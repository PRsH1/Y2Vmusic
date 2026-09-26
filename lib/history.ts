/**
 * What this browser has downloaded, newest first.
 *
 * A download takes one to two minutes here, so grabbing the same track twice by
 * accident is expensive. Kept in localStorage like the theme and format choice:
 * this is a single-user app with no database, and nothing here needs to reach
 * the server.
 */

const KEY = "y2v.history";
const MAX_ENTRIES = 200;

export type HistoryEntry = {
  videoId: string;
  artist: string;
  title: string;
  format: string;
  at: number;
};

function isEntry(value: unknown): value is HistoryEntry {
  const entry = value as HistoryEntry;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.videoId === "string" &&
    typeof entry.title === "string" &&
    typeof entry.at === "number"
  );
}

export function readHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Anything malformed is dropped rather than trusted — the value is
    // user-editable storage, not something this code wrote for certain.
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Records a download, moving a repeat to the front instead of duplicating it. */
export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...readHistory().filter((item) => item.videoId !== entry.videoId)].slice(
    0,
    MAX_ENTRIES,
  );

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Full or blocked storage: the download itself already succeeded.
  }

  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
