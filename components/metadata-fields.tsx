"use client";

type MetadataFieldsProps = {
  artist: string;
  disabled: boolean;
  onArtistChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  title: string;
};

/**
 * Artist and title as they will be written into the file's tags and name.
 *
 * Prefilled from lib/metadata.ts, which reads them out of the video title. The
 * parse is a best guess — "Artist 'Title' MV" shapes are common but not
 * universal — so the listener gets the last word before saving.
 */
export function MetadataFields({
  artist,
  disabled,
  onArtistChange,
  onTitleChange,
  title,
}: MetadataFieldsProps) {
  const inputClass =
    "h-9 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 text-sm text-[color:var(--text)] transition-colors hover:border-[color:var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-xs text-[color:var(--muted)]">아티스트</span>
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => onArtistChange(event.target.value)}
          spellCheck={false}
          value={artist}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-[color:var(--muted)]">제목</span>
        <input
          className={inputClass}
          disabled={disabled}
          onChange={(event) => onTitleChange(event.target.value)}
          spellCheck={false}
          value={title}
        />
      </label>
    </div>
  );
}
