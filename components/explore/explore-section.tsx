"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryPills } from "@/components/explore/category-pills";
import { SearchBar } from "@/components/explore/search-bar";
import { TrackList } from "@/components/explore/track-list";
import { PLAYLISTS } from "@/lib/playlists";
import type { ChartTrack } from "@/lib/youtube-api";

type ExploreSectionProps = {
  disabled: boolean;
  onTrackSelect: (videoId: string) => void;
};

type ExploreMode = "chart" | "search";

const REQUEST_TIMEOUT_MS = 45_000;

async function readError(response: Response): Promise<string> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "요청을 처리하지 못했습니다.";
  }

  const text = await response.text();
  return text || "요청을 처리하지 못했습니다.";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function ExploreSection({
  disabled,
  onTrackSelect,
}: ExploreSectionProps) {
  const [activePlaylist, setActivePlaylist] = useState(PLAYLISTS[0]?.id ?? "");
  const [tracks, setTracks] = useState<ChartTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ExploreMode>("chart");
  const requestIdRef = useRef(0);

  async function loadChart(playlistId: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setMode("chart");

    try {
      const response = await fetchWithTimeout(
        `/api/charts?id=${encodeURIComponent(playlistId)}`,
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as { tracks?: ChartTrack[] };

      if (requestIdRef.current !== requestId) {
        return;
      }

      setTracks(data.tracks ?? []);
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setTracks([]);
      setError(getErrorMessage(loadError));
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  async function search(query: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setActivePlaylist("");
    setMode("search");

    try {
      const response = await fetchWithTimeout("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as { results?: ChartTrack[] };

      if (requestIdRef.current !== requestId) {
        return;
      }

      setTracks(data.results ?? []);
    } catch (searchError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setTracks([]);
      setError(getErrorMessage(searchError));
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (activePlaylist) {
      void loadChart(activePlaylist);
    }
  }, []);

  return (
    <section className="grid gap-4 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4">
      <div className="grid gap-1">
        <h2 className="text-sm font-bold text-[color:var(--text)]">탐색</h2>
        <p className="text-xs text-[color:var(--muted)]">
          차트에서 선택하거나 검색하세요
        </p>
      </div>

      <SearchBar disabled={disabled || loading} onSearch={search} />

      <CategoryPills
        activeId={mode === "chart" ? activePlaylist : null}
        items={PLAYLISTS.map((playlist) => ({
          id: playlist.id,
          label: playlist.label,
        }))}
        onSelect={(id) => {
          if (disabled || loading) {
            return;
          }

          setActivePlaylist(id);
          void loadChart(id);
        }}
      />

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-sm text-[color:var(--muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--spinner-border)] border-t-[color:var(--accent)]" />
          {mode === "search" ? "검색 중" : "차트 불러오는 중"}
        </div>
      ) : error ? (
        <div className="rounded-md border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
          {error}
        </div>
      ) : tracks.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--muted)]">
          {mode === "search"
            ? "검색 결과가 없습니다"
            : "곡 목록을 불러올 수 없습니다"}
        </p>
      ) : (
        <TrackList
          onTrackSelect={(videoId) => {
            if (!disabled) {
              onTrackSelect(videoId);
            }
          }}
          showRank={mode === "chart"}
          tracks={tracks}
        />
      )}
    </section>
  );
}
