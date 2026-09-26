"use client";

import type { HistoryEntry } from "@/lib/history";

type DownloadHistoryProps = {
  disabled: boolean;
  entries: HistoryEntry[];
  onClear: () => void;
  onSelect: (videoId: string) => void;
};

const VISIBLE = 10;

function formatWhen(at: number): string {
  const date = new Date(at);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Recent downloads from this browser, collapsed by default. */
export function DownloadHistory({ disabled, entries, onClear, onSelect }: DownloadHistoryProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4">
      <summary className="cursor-pointer text-sm font-bold text-[color:var(--text)]">
        최근 받은 곡 ({entries.length})
      </summary>
      <ul className="mt-3 grid gap-1">
        {entries.slice(0, VISIBLE).map((entry) => (
          <li className="flex items-center justify-between gap-3" key={entry.videoId}>
            <span className="min-w-0 truncate text-sm text-[color:var(--text)]">
              {entry.artist ? `${entry.artist} - ${entry.title}` : entry.title}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-[color:var(--muted)]">
                {entry.format.toUpperCase()} · {formatWhen(entry.at)}
              </span>
              <button
                className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                onClick={() => onSelect(entry.videoId)}
                type="button"
              >
                다시 받기
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button
        className="mt-3 text-xs text-[color:var(--muted)] underline-offset-2 hover:underline"
        onClick={onClear}
        type="button"
      >
        기록 지우기
      </button>
    </details>
  );
}
