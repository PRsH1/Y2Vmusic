"use client";

import { useSyncExternalStore } from "react";
import { getPreviewTime, subscribePreviewTime } from "@/lib/preview-clock";
import { formatTime, parseTime } from "@/lib/trim";

export type TrimSuggestionView = {
  start: number | null;
  end: number | null;
  middle: number;
};

type TrimControlsProps = {
  disabled: boolean;
  duration: number | null;
  enabled: boolean;
  end: string;
  onEnabledChange: (enabled: boolean) => void;
  onEndChange: (value: string) => void;
  onStartChange: (value: string) => void;
  start: string;
  suggestion: TrimSuggestionView | null;
  videoId: string | null;
};

/**
 * Optional start/end for the saved file. Off by default so the normal flow is
 * unchanged. A detected non-music section is offered, never applied on its
 * own — community tags are sometimes wrong, and a silent wrong cut would
 * remove real music without anyone noticing.
 */
export function TrimControls({
  disabled,
  duration,
  enabled,
  end,
  onEnabledChange,
  onEndChange,
  onStartChange,
  start,
  suggestion,
  videoId,
}: TrimControlsProps) {
  const previewTime = useSyncExternalStore(
    subscribePreviewTime,
    () => (videoId ? getPreviewTime(videoId) : null),
    () => null,
  );

  const from = parseTime(start);
  const to = parseTime(end);
  const invalid = Number.isNaN(from) || Number.isNaN(to);
  const keptStart = from ?? 0;
  const keptEnd = to ?? duration;
  const kept = !invalid && keptEnd !== null ? keptEnd - keptStart : null;
  const hasSuggestion = suggestion && (suggestion.start !== null || suggestion.end !== null);

  function applySuggestion() {
    if (!suggestion) {
      return;
    }

    onEnabledChange(true);
    onStartChange(suggestion.start !== null ? formatTime(suggestion.start) : "");
    onEndChange(suggestion.end !== null ? formatTime(suggestion.end) : "");
  }

  const inputClass =
    "h-9 w-24 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 text-sm text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-60";
  const markClass =
    "rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-2 py-1 text-xs text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="grid gap-2">
      {hasSuggestion ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 py-2 text-xs text-[color:var(--muted)]">
          <span>
            비음악 구간이 감지됐습니다:{" "}
            {suggestion.start !== null ? `0:00–${formatTime(suggestion.start)}` : ""}
            {suggestion.start !== null && suggestion.end !== null ? ", " : ""}
            {suggestion.end !== null ? `${formatTime(suggestion.end)}–끝` : ""}
            {suggestion.middle > 0 ? ` · 중간 구간 ${suggestion.middle}곳은 자르지 않습니다` : ""}
            <span className="ml-1 opacity-70">(SponsorBlock)</span>
          </span>
          <button className={markClass} disabled={disabled} onClick={applySuggestion} type="button">
            적용
          </button>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-[color:var(--text)]">
        <input
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
        구간 자르기
      </label>

      {enabled ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
            <span>시작</span>
            <input
              className={inputClass}
              disabled={disabled}
              onChange={(event) => onStartChange(event.target.value)}
              placeholder="0:00"
              value={start}
            />
            <span>끝</span>
            <input
              className={inputClass}
              disabled={disabled}
              onChange={(event) => onEndChange(event.target.value)}
              placeholder={duration ? formatTime(duration) : "끝까지"}
              value={end}
            />
            {kept !== null && kept > 0 && duration ? (
              <span>
                {formatTime(duration)} → {formatTime(kept)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
            <button
              className={markClass}
              disabled={disabled || previewTime === null}
              onClick={() => previewTime !== null && onStartChange(formatTime(previewTime))}
              type="button"
            >
              미리듣기 위치를 시작으로
            </button>
            <button
              className={markClass}
              disabled={disabled || previewTime === null}
              onClick={() => previewTime !== null && onEndChange(formatTime(previewTime))}
              type="button"
            >
              미리듣기 위치를 끝으로
            </button>
            <span>
              {previewTime !== null
                ? `현재 ${formatTime(previewTime)}`
                : "미리듣기를 재생하면 위치를 찍을 수 있어요"}
            </span>
          </div>

          {invalid ? (
            <p className="text-xs text-[color:var(--danger-text)]">시각은 1:23 형식으로 입력하세요.</p>
          ) : kept !== null && kept < 1 ? (
            <p className="text-xs text-[color:var(--danger-text)]">끝이 시작보다 1초 이상 뒤여야 합니다.</p>
          ) : end ? (
            <p className="text-xs text-[color:var(--muted)]">잘린 끝에는 0.5초 페이드아웃이 들어갑니다 (OPUS 제외).</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
