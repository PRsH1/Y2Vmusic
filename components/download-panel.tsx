"use client";

import { DownloadButton } from "@/components/download-button";
import {
  FLAC_NOTE,
  FormatSelector,
  OPUS_NOTE,
  type AudioFormatChoice,
  type QualityChoice,
} from "@/components/format-selector";
import { formatSource } from "@/components/video-info";
import type { VideoInfo } from "@/lib/ytdlp";

type DownloadPanelProps = {
  busy: boolean;
  error: string | null;
  format: AudioFormatChoice;
  info: VideoInfo | null;
  loading: boolean;
  onClose: () => void;
  onDownload: () => void;
  onFormatChange: (format: AudioFormatChoice) => void;
  onQualityChange: (quality: QualityChoice) => void;
  onRetry: () => void;
  quality: QualityChoice;
};

/**
 * Opens inline under the selected track, in the same slot the preview uses.
 *
 * The result used to appear in a card at the top of the page, which meant
 * picking a song from a long chart threw the reader back to the top and away
 * from the list they were browsing. Keeping the action where the click
 * happened also matches how preview already behaves.
 */
export function DownloadPanel({
  busy,
  error,
  format,
  info,
  loading,
  onClose,
  onDownload,
  onFormatChange,
  onQualityChange,
  onRetry,
  quality,
}: DownloadPanelProps) {
  const note = format === "flac" ? FLAC_NOTE : format === "opus" ? OPUS_NOTE : null;

  return (
    <section className="grid gap-3 rounded-md border border-[color:var(--accent)] bg-[color:var(--surface)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[color:var(--text)]">다운로드</h3>
        <button
          aria-label="다운로드 패널 닫기"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] text-xs font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--control-hover)] hover:text-[color:var(--text)]"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-2 text-sm text-[color:var(--muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--spinner-border)] border-t-[color:var(--accent)]" />
          영상 정보를 불러오는 중
        </div>
      ) : null}

      {error ? (
        <div className="grid gap-2 rounded-md border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
          <span className="break-words">{error}</span>
          <button
            className="justify-self-start rounded-md border border-[color:var(--danger-border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-bold text-[color:var(--danger-text)] transition-colors hover:bg-[color:var(--danger-soft)]"
            onClick={onRetry}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {info && !loading ? (
        <>
          <p className="text-xs text-[color:var(--muted)]">{formatSource(info)}</p>
          <FormatSelector
            disabled={busy}
            format={format}
            onFormatChange={onFormatChange}
            onQualityChange={onQualityChange}
            quality={quality}
            variant="compact"
          />
          {note ? (
            <p className="text-xs text-[color:var(--muted)]">{note}</p>
          ) : null}
          <DownloadButton
            disabled={busy}
            downloading={busy}
            onClick={onDownload}
          />
        </>
      ) : null}
    </section>
  );
}
