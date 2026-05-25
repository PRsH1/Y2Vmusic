type ProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="grid gap-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[color:var(--muted)]">{label}</span>
        <span className="font-mono text-[color:var(--text)]">{normalized}%</span>
      </div>
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalized}
        className="h-3 overflow-hidden rounded-md border border-[#3f4648] bg-[#0d0f0f]"
        role="progressbar"
      >
        <div
          className="h-full rounded-md bg-[color:var(--accent)] transition-[width] duration-300"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
