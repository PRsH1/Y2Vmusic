"use client";

type PreviewPlayerProps = {
  videoId: string;
  title: string | null;
  channel: string | null;
  onClose: () => void;
};

export function PreviewPlayer({
  videoId,
  title,
  channel,
  onClose,
}: PreviewPlayerProps) {
  return (
    <section className="grid gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[color:var(--text)]">
          미리듣기
        </h2>
        <button
          aria-label="미리듣기 닫기"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] text-xs font-bold text-[color:var(--muted)] transition-colors hover:border-[#586164] hover:text-[color:var(--text)]"
          onClick={onClose}
          type="button"
        >
          X
        </button>
      </div>
      <div className="mx-auto w-full max-w-[480px]">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-[#2a2f30] bg-[#0c0d0e]">
          <iframe
            allow="encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            key={videoId}
            src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`}
            title="미리듣기"
          />
        </div>
      </div>
      {title ? (
        <p className="text-center text-sm text-[color:var(--muted)]">
          <span className="font-bold text-[color:var(--text)]">{title}</span>
          {channel ? ` — ${channel}` : ""}
        </p>
      ) : null}
    </section>
  );
}
