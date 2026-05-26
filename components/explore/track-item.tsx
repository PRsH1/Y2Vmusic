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
          ? "grid-cols-[2rem_48px_1fr_auto_auto]"
          : "grid-cols-[48px_1fr_auto_auto]",
      ].join(" ")}
    >
      {hasRank ? (
        <span className="text-right text-sm font-bold text-[color:var(--accent)]">
          #{rank}
        </span>
      ) : null}
      <button
        aria-label="미리듣기"
        className="relative aspect-square h-12 w-12 cursor-pointer overflow-hidden rounded bg-[#0c0d0e]"
        onClick={() => onPreview(videoId, title, channel)}
        type="button"
      >
        {thumbnail ? (
          <img alt="" className="h-full w-full object-cover" src={thumbnail} />
        ) : (
          <span className="block h-full w-full bg-[#0c0d0e]" />
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
      <span className="self-center text-xs text-[color:var(--muted)]">
        {duration ?? ""}
      </span>
      <span className="flex items-center gap-2">
        <button
          className="flex h-8 items-center justify-center rounded-md border border-[#3f4648] bg-[color:var(--surface-raised)] px-3 text-xs font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          onClick={() => onPreview(videoId, title, channel)}
          type="button"
        >
          미리듣기
        </button>
        <button
          className="flex h-8 items-center justify-center rounded-md border border-[#3f4648] bg-[color:var(--surface-raised)] px-3 text-xs font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          onClick={() => onSelect(videoId)}
          type="button"
        >
          다운로드
        </button>
      </span>
    </div>
  );
}
