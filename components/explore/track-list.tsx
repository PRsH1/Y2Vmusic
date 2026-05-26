"use client";

import { useEffect, useState } from "react";
import { TrackItem } from "@/components/explore/track-item";
import type { ChartTrack } from "@/lib/youtube-api";

type TrackListProps = {
  tracks: ChartTrack[];
  onTrackSelect: (videoId: string) => void;
  onPreview: (videoId: string, title: string, channel: string) => void;
  showRank?: boolean;
};

const PAGE_SIZE = 20;

export function TrackList({
  tracks,
  onTrackSelect,
  onPreview,
  showRank = false,
}: TrackListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleTracks = tracks.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tracks]);

  return (
    <div className="grid gap-3">
      <div className="[&>*:last-child]:border-b-0">
        {visibleTracks.map((track, index) => (
          <TrackItem
            channel={track.channel}
            duration={track.duration}
            key={`${track.videoId}-${index}`}
            onPreview={onPreview}
            onSelect={onTrackSelect}
            rank={showRank ? track.rank : undefined}
            thumbnail={track.thumbnail}
            title={track.title}
            videoId={track.videoId}
          />
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
