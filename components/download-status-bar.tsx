"use client";

import { ProgressBar } from "@/components/progress-bar";

type DownloadStatusBarProps = {
  downloading: boolean;
  indeterminate: boolean;
  label: string;
  onDismiss: () => void;
  progress: number;
  savedFileName: string | null;
  trackTitle: string | null;
};

/**
 * Pinned to the bottom of the viewport while a download runs and just after
 * it finishes.
 *
 * Extraction takes one to two minutes on this server, and people keep
 * browsing the chart meanwhile. With the progress bar living in a card at the
 * top of the page, checking whether a download had finished meant scrolling
 * back up. Status belongs somewhere always visible; the action belongs where
 * the click happened (see DownloadPanel).
 */
export function DownloadStatusBar({
  downloading,
  indeterminate,
  label,
  onDismiss,
  progress,
  savedFileName,
  trackTitle,
}: DownloadStatusBarProps) {
  if (!downloading && !savedFileName) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--surface-raised)] px-4 py-3 shadow-lg sm:px-6"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-2">
        {downloading ? (
          <>
            {trackTitle ? (
              <p className="truncate text-xs text-[color:var(--muted)]">
                {trackTitle}
              </p>
            ) : null}
            <ProgressBar
              indeterminate={indeterminate}
              label={label}
              value={progress}
            />
          </>
        ) : (
          <div className="flex items-start justify-between gap-3 text-sm text-[color:var(--accent-strong)]">
            <span className="min-w-0 break-words">
              ✓ {savedFileName} 저장 완료 · 브라우저 다운로드 폴더를 확인하세요
            </span>
            <button
              aria-label="완료 알림 닫기"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--accent)] bg-[color:var(--surface)] text-xs font-bold text-[color:var(--accent-strong)] transition-colors hover:bg-[color:var(--accent-soft-hover)]"
              onClick={onDismiss}
              type="button"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
