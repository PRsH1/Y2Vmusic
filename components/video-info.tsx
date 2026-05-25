import type { VideoInfo } from "@/lib/ytdlp";

type VideoInfoProps = {
  info: VideoInfo;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "길이 알 수 없음";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const parts =
    hours > 0
      ? [hours, minutes, rest]
      : [minutes, rest];

  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

function formatSource(info: VideoInfo): string {
  const source = info.formats[0];

  if (!source) {
    return "원본 스트림 정보 없음";
  }

  const bitrate = source.bitrate ? ` ${source.bitrate}kbps` : "";
  return `원본: ${source.codec}${bitrate} (${source.ext})`;
}

export function VideoInfoCard({ info }: VideoInfoProps) {
  return (
    <section className="grid gap-4 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-4 md:grid-cols-[180px_1fr]">
      <div className="aspect-video overflow-hidden rounded-md border border-[#2a2f30] bg-[#0c0d0e]">
        {info.thumbnail ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            src={info.thumbnail}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[color:var(--muted)]">
            썸네일 없음
          </div>
        )}
      </div>
      <div className="grid min-w-0 content-start gap-3">
        <div className="grid gap-1">
          <h2 className="break-words text-xl font-bold leading-snug text-[color:var(--text)]">
            {info.title}
          </h2>
          <p className="text-sm text-[color:var(--muted)]">{info.channel}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-md border border-[#3f4648] bg-[color:var(--surface-raised)] px-3 py-1 text-[color:var(--text)]">
            {formatDuration(info.duration)}
          </span>
          <span className="rounded-md border border-[#3f4648] bg-[color:var(--surface-raised)] px-3 py-1 text-[color:var(--text)]">
            {formatSource(info)}
          </span>
        </div>
      </div>
    </section>
  );
}
