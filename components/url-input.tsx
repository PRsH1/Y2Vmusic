"use client";

type UrlInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function UrlInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: UrlInputProps) {
  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[color:var(--muted)]">
          YouTube URL
        </span>
        <input
          className="h-12 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-base text-[color:var(--text)] placeholder:text-[color:var(--placeholder)] shadow-sm transition-colors hover:border-[color:var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          inputMode="url"
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          spellCheck={false}
          type="url"
          value={value}
        />
      </label>
      <button
        className="mt-auto h-12 rounded-md bg-[color:var(--accent)] px-5 text-sm font-bold text-[color:var(--accent-contrast)] transition-colors hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={disabled || value.trim().length === 0}
        type="submit"
      >
        검색
      </button>
    </form>
  );
}
