"use client";

export type AudioFormatChoice = "mp3" | "m4a" | "opus" | "flac";
export type QualityChoice = "best" | "high" | "medium";

type FormatSelectorProps = {
  format: AudioFormatChoice;
  quality: QualityChoice;
  disabled: boolean;
  onFormatChange: (format: AudioFormatChoice) => void;
  onQualityChange: (quality: QualityChoice) => void;
};

const FORMAT_OPTIONS: Array<{
  value: AudioFormatChoice;
  label: string;
  detail: string;
}> = [
  { value: "mp3", label: "MP3", detail: "320 / 192 / 128kbps" },
  { value: "m4a", label: "M4A", detail: "AAC 변환" },
  { value: "opus", label: "OPUS", detail: "원본 스트림" },
  { value: "flac", label: "FLAC", detail: "무손실 컨테이너" },
];

const QUALITY_OPTIONS: Array<{
  value: QualityChoice;
  label: string;
  detail: string;
}> = [
  { value: "best", label: "최고", detail: "MP3 320 / M4A 256" },
  { value: "high", label: "높음", detail: "192kbps" },
  { value: "medium", label: "보통", detail: "128kbps" },
];

export function FormatSelector({
  format,
  quality,
  disabled,
  onFormatChange,
  onQualityChange,
}: FormatSelectorProps) {
  const qualityDisabled = disabled || format === "opus" || format === "flac";

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
                    ? "border-[color:var(--accent)] bg-[rgba(57,217,138,0.12)]"
                    : "border-[#3f4648] bg-[color:var(--surface-raised)] hover:border-[#586164]",
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
                    ? "border-[color:var(--warning)] bg-[rgba(240,184,79,0.12)]"
                    : "border-[#3f4648] bg-[color:var(--surface-raised)]",
                  qualityDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-[#68625a]",
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
