"use client";

type DownloadButtonProps = {
  disabled: boolean;
  downloading: boolean;
  onClick: () => void;
};

export function DownloadButton({
  disabled,
  downloading,
  onClick,
}: DownloadButtonProps) {
  return (
    <button
      className="h-12 w-full rounded-md bg-[color:var(--accent)] px-5 text-sm font-bold text-[color:var(--accent-contrast)] transition-colors hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55 md:w-auto md:min-w-44"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {downloading ? "처리 중" : "다운로드"}
    </button>
  );
}
