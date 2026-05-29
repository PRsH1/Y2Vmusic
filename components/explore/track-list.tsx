"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { TrackItem } from "@/components/explore/track-item";
import { PreviewPlayer } from "@/components/preview-player";
import type { ChartTrack } from "@/lib/youtube-api";

type TrackListProps = {
  onTrackSelect: (videoId: string) => void;
  showRank?: boolean;
  tracks: ChartTrack[];
};

const PAGE_SIZE = 20;

export function TrackList({
  onTrackSelect,
  showRank = false,
  tracks,
}: TrackListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const visibleTracks = tracks.slice(0, visibleCount);

  useEffect(() => {
    setActiveIndex(null);
    setVisibleCount(PAGE_SIZE);
  }, [tracks]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";

    previewElement.scrollIntoView({ behavior, block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="grid gap-3">
      <div className="[&>*:last-child]:border-b-0">
        {visibleTracks.map((track, index) => (
          <Fragment key={`${track.videoId}-${index}`}>
            <TrackItem
              channel={track.channel}
              duration={track.duration}
              index={index}
              isPreviewing={index === activeIndex}
              onSelect={onTrackSelect}
              onTogglePreview={(trackIndex) =>
                setActiveIndex((current) =>
                  current === trackIndex ? null : trackIndex,
                )
              }
              rank={showRank ? track.rank : undefined}
              thumbnail={track.thumbnail}
              title={track.title}
              videoId={track.videoId}
            />
            {index === activeIndex ? (
              <div
                className="border-b border-[color:var(--border)] px-2 py-3"
                ref={previewRef}
              >
                <PreviewPlayer
                  channel={track.channel}
                  onClose={() => setActiveIndex(null)}
                  title={track.title}
                  videoId={track.videoId}
                />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
      {visibleCount < tracks.length ? (
        <button
          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] py-2 text-sm text-[color:var(--muted)] transition-colors hover:bg-[color:var(--surface-raised)] hover:text-[color:var(--text)]"
          onClick={() =>
            setVisibleCount((current) => Math.min(current + PAGE_SIZE, tracks.length))
          }
          type="button"
        >
          더 보기
        </button>
      ) : null}
    </div>
  );
}
