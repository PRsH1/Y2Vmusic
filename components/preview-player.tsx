"use client";

import { useEffect, useRef } from "react";
import { setPreviewTime } from "@/lib/preview-clock";

const YOUTUBE_ORIGIN = "https://www.youtube.com";

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
  const frameRef = useRef<HTMLIFrameElement>(null);

  // The embed reports playback over postMessage once told someone is
  // listening (enablejsapi=1). Only messages from this frame are trusted —
  // any page could post to this window.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== YOUTUBE_ORIGIN || event.source !== frameRef.current?.contentWindow) {
        return;
      }

      let data: { info?: { currentTime?: unknown } } | null = null;

      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const time = data?.info?.currentTime;

      if (typeof time === "number" && Number.isFinite(time)) {
        setPreviewTime(videoId, time);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoId]);

  function startListening() {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: videoId, channel: "widget" }),
      YOUTUBE_ORIGIN,
    );
  }

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
            onLoad={startListening}
            ref={frameRef}
            src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.origin)}`}
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
