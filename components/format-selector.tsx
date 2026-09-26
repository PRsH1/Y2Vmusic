"use client";

export type AudioFormatChoice = "mp3" | "m4a" | "opus" | "flac";
export type QualityChoice = "best" | "high" | "medium";

type FormatSelectorProps = {
  format: AudioFormatChoice;
  quality: QualityChoice;
  disabled: boolean;
  onFormatChange: (format: AudioFormatChoice) => void;
  onQualityChange: (quality: QualityChoice) => void;
  /**
   * "compact" renders the same options as a single row of pills, for the
   * panel that opens inline under a track. The option lists stay shared so
   * the two layouts can never drift apart.
   */
  variant?: "full" | "compact";
};

const FORMAT_OPTIONS: Array<{
  value: AudioFormatChoice;
  label: string;
  detail: string;
}> = [
  { value: "mp3", label: "MP3", detail: "320 / 192 / 128kbps" },
  { value: "m4a", label: "M4A", detail: "AAC 변환" },
  { value: "opus", label: "OPUS", detail: "원본 무변환" },
  { value: "flac", label: "FLAC", detail: "무손실 컨테이너" },
];

/** Shown when the chosen format cannot improve on a lossy source. */
export const FLAC_NOTE =
  "YouTube 원본이 손실 압축이라 FLAC으로 바꿔도 음질은 그대로이고 용량만 커집니다.";

export const OPUS_NOTE =
  "변환 없이 받습니다. YouTube가 주는 스트림에 따라 확장자가 달라질 수 있습니다.";

const QUALITY_OPTIONS: Array<{
  value: QualityChoice;
  label: string;
  detail: string;
}> = [
  { value: "best", label: "최고", detail: "MP3 320 / M4A 256" },
  { value: "high", label: "높음", detail: "192kbps" },
  { value: "medium", label: "보통", detail: "128kbps" },
];

function pillClass(selected: boolean, disabled: boolean): string {
  return [
    "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
    selected
      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
      : "border-[color:var(--border)] bg-[color:var(--surface-raised)] text-[color:var(--muted)]",
    disabled
      ? "cursor-not-allowed opacity-50"
      : "cursor-pointer hover:border-[color:var(--control-hover)]",
  ].join(" ");
}

function CompactSelector({
  format,
  quality,
  disabled,
  onFormatChange,
  onQualityChange,
}: Omit<FormatSelectorProps, "variant">) {
  const qualityDisabled = disabled || format === "opus" || format === "flac";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--muted)]">포맷</span>
        {FORMAT_OPTIONS.map((option) => (
          <button
            aria-pressed={format === option.value}
            className={pillClass(format === option.value, disabled)}
            disabled={disabled}
            key={option.value}
            onClick={() => onFormatChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--muted)]">품질</span>
        {QUALITY_OPTIONS.map((option) => (
          <button
            aria-pressed={quality === option.value}
            className={pillClass(quality === option.value, qualityDisabled)}
            disabled={qualityDisabled}
            key={option.value}
            onClick={() => onQualityChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        {/* Only the format can make quality meaningless. Being mid-download
            disables the pills too, but that is not a reason to say so. */}
        {format === "opus" || format === "flac" ? (
          <span className="text-xs text-[color:var(--muted)]">
            {format === "opus" ? "원본 그대로" : "품질 옵션 없음"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function FormatSelector({
  format,
  quality,
  disabled,
  onFormatChange,
  onQualityChange,
  variant = "full",
}: FormatSelectorProps) {
  const qualityDisabled = disabled || format === "opus" || format === "flac";

  if (variant === "compact") {
    return (
      <CompactSelector
        disabled={disabled}
        format={format}
        onFormatChange={onFormatChange}
        onQualityChange={onQualityChange}
        quality={quality}
      />
    );
  }

  return (
    <section className="grid gap-5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="grid gap-3">
        <h3 className="text-sm font-bold text-[color:var(--text)]">포맷</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FORMAT_OPTIONS.map((option) => {
            const selected = format === option.value;

            return (
              <label
                className={[
                  "grid min-h-20 cursor-pointer gap-1 rounded-md border p-3 transition-colors",
                  selected
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface-raised)] hover:border-[color:var(--control-hover)]",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
                key={option.value}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  disabled={disabled}
                  name="format"
                  onChange={() => onFormatChange(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="text-base font-bold text-[color:var(--text)]">
                  {option.label}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {option.detail}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[color:var(--text)]">품질</h3>
          {qualityDisabled ? (
            <span className="text-xs text-[color:var(--muted)]">
              선택한 포맷은 품질 옵션을 적용하지 않음
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {QUALITY_OPTIONS.map((option) => {
            const selected = quality === option.value;

            return (
              <label
                className={[
                  "grid min-h-16 gap-1 rounded-md border p-3 transition-colors",
                  selected
                    ? "border-[color:var(--warning)] bg-[color:var(--warning-soft)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface-raised)]",
                  qualityDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-[color:var(--control-hover)]",
                ].join(" ")}
                key={option.value}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  disabled={qualityDisabled}
                  name="quality"
                  onChange={() => onQualityChange(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="text-sm font-bold text-[color:var(--text)]">
                  {option.label}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {option.detail}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
