"use client";

type TrackItemProps = {
  rank?: number;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  duration: string | null;
  onSelect: (videoId: string) => void;
  onPreview: (videoId: string, title: string, channel: string) => void;
};

export function TrackItem({
  rank,
  videoId,
  title,
  channel,
  thumbnail,
  duration,
  onSelect,
  onPreview,
}: TrackItemProps) {
  const hasRank = typeof rank === "number";

  return (
    <div
      className={[
        "grid w-full items-center gap-3 border-b border-[color:var(--border)] p-2 transition-colors hover:rounded-md hover:bg-[color:var(--surface-raised)]",
        hasRank
          ? "grid-cols-[2rem_48px_1fr_auto] sm:grid-cols-[2rem_48px_1fr_auto_auto]"
          : "grid-cols-[48px_1fr_auto] sm:grid-cols-[48px_1fr_auto_auto]",
      ].join(" ")}
    >
      {hasRank ? (
        <span className="text-right text-sm font-bold text-[color:var(--accent)]">
          #{rank}
        </span>
      ) : null}
      <button
        aria-label="미리듣기"
        className="relative aspect-square h-12 w-12 cursor-pointer overflow-hidden rounded bg-[color:var(--media-bg)]"
        onClick={() => onPreview(videoId, title, channel)}
        type="button"
      >
        {thumbnail ? (
          <img alt="" className="h-full w-full object-cover" src={thumbnail} />
        ) : (
          <span className="block h-full w-full bg-[color:var(--media-bg)]" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.4)] text-white opacity-0 transition-opacity hover:opacity-100">
          <span className="text-lg">▶</span>
        </span>
      </button>
      <span className="grid min-w-0 gap-1">
        <span className="truncate text-sm font-bold text-[color:var(--text)]">
          {title}
        </span>
        <span className="truncate text-xs text-[color:var(--muted)]">
          {channel}
        </span>
      </span>
      <span className="hidden self-center text-xs text-[color:var(--muted)] sm:block">
        {duration ?? ""}
      </span>
      <span className="flex items-center gap-2">
        <button
          aria-label="미리듣기"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-0 text-sm font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] sm:w-auto sm:rounded-md sm:px-3 sm:text-xs"
          onClick={() => onPreview(videoId, title, channel)}
          type="button"
        >
          <span className="sm:hidden">▶</span>
          <span className="hidden sm:inline">미리듣기</span>
        </button>
        <button
          aria-label="다운로드"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-0 text-sm font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] sm:w-auto sm:rounded-md sm:px-3 sm:text-xs"
          onClick={() => onSelect(videoId)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4 sm:hidden"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4v13m0 0 5-5m-5 5-5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <span className="hidden sm:inline">다운로드</span>
        </button>
      </span>
    </div>
  );
}
