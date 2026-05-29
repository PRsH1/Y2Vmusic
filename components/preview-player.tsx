"use client";

import { useEffect } from "react";

type PreviewPlayerProps = {
  channel: string | null;
  onClose: () => void;
  title: string | null;
  videoId: string;
};

export function PreviewPlayer({
  channel,
  onClose,
  title,
  videoId,
}: PreviewPlayerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <section className="grid gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[color:var(--text)]">
          미리듣기
        </h2>
        <button
          aria-label="미리듣기 닫기"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] text-xs font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--control-hover)] hover:text-[color:var(--text)]"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>
      <div className="mx-auto w-full max-w-[480px]">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-[color:var(--media-border)] bg-[color:var(--media-bg)]">
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
