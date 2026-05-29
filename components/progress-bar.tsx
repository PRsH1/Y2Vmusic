type ProgressBarProps = {
  indeterminate?: boolean;
  label: string;
  value: number;
};

export function ProgressBar({
  indeterminate = false,
  label,
  value,
}: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="grid gap-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[color:var(--muted)]">{label}</span>
        {indeterminate ? null : (
          <span className="font-mono text-[color:var(--text)]">{normalized}%</span>
        )}
      </div>
      <div
        aria-busy={indeterminate ? true : undefined}
        aria-valuemax={indeterminate ? undefined : 100}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuenow={indeterminate ? undefined : normalized}
        className="h-3 overflow-hidden rounded-md border border-[color:var(--border)] bg-[color:var(--progress-bg)]"
        role="progressbar"
      >
        {indeterminate ? (
          <div className="progress-indeterminate-bar h-full rounded-md bg-[color:var(--accent)]" />
        ) : (
          <div
            className="h-full rounded-md bg-[color:var(--accent)] transition-[width] duration-300"
            style={{ width: `${normalized}%` }}
          />
        )}
      </div>
    </div>
  );
}
