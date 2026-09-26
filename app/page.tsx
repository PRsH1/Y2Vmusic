"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { DownloadHistory } from "@/components/download-history";
import { DownloadPanel } from "@/components/download-panel";
import { DownloadStatusBar } from "@/components/download-status-bar";
import { ExploreSection } from "@/components/explore/explore-section";
import {
  FormatSelector,
  type AudioFormatChoice,
  type QualityChoice,
} from "@/components/format-selector";
import { GuideModal } from "@/components/guide-modal";
import { MetadataFields } from "@/components/metadata-fields";
import {
  TrimControls,
  type TrimSuggestionView,
} from "@/components/trim-controls";
import { UrlInput } from "@/components/url-input";
import { VideoInfoCard } from "@/components/video-info";
import {
  addHistory,
  clearHistory,
  readHistory,
  type HistoryEntry,
} from "@/lib/history";
import { parseTrackMetadata } from "@/lib/metadata";
import { parseTime } from "@/lib/trim";
import {
  readFormat,
  readQuality,
  writeFormat,
  writeQuality,
} from "@/lib/prefs";
import { extractVideoId } from "@/lib/validate";
import type { VideoInfo } from "@/lib/ytdlp";

type AppStatus = "idle" | "loading-info" | "ready" | "downloading" | "error";
type Theme = "light" | "dark";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

async function readError(response: Response): Promise<string> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "요청을 처리하지 못했습니다.";
  }

  const text = await response.text();
  return text || "요청을 처리하지 못했습니다.";
}

function parseFileName(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const fallbackMatch = /filename="([^"]+)"/i.exec(header);
  return fallbackMatch?.[1] ?? null;
}

const PROCESSING_LABEL = "서버에서 추출·변환 중… (시간이 걸릴 수 있어요)";
const QUEUED_LABEL = "대기 중… 앞의 작업이 끝나면 시작됩니다";
// Short enough that a percentage visibly moves; /api/status is a map lookup.
const JOB_POLL_INTERVAL_MS = 1500;

type JobUpdate = {
  state: "queued" | "running";
  phase: "preparing" | "downloading" | "converting" | null;
  percent: number | null;
};

/**
 * Label and bar for what the server says this job is doing. Each phase gets
 * its own 0-100 rather than one blended total: weighting download against
 * conversion would mean inventing a split, and this app does not fake progress.
 */
function describeJob(job: JobUpdate, format: AudioFormatChoice): {
  label: string;
  percent: number | null;
} {
  if (job.state === "queued") {
    return { label: QUEUED_LABEL, percent: null };
  }

  if (job.phase === "downloading") {
    return { label: "YouTube에서 받는 중", percent: job.percent };
  }

  if (job.phase === "converting") {
    return { label: `${format.toUpperCase()}로 변환 중`, percent: job.percent };
  }

  // Resolving the video and solving YouTube's JS challenge reports nothing.
  return { label: "YouTube에서 준비 중…", percent: null };
}

function createJobId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // Older Safari has crypto but not randomUUID. The id only has to be unique
  // per in-flight request, and the server ignores anything malformed.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Polls this job's own state until stopped. Aggregate queue counts cannot
 * tell a client whether it is the one running, so the server is asked about
 * this specific job id.
 */
function watchJobState(
  jobId: string,
  onUpdate: (job: JobUpdate) => void,
): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) {
      return;
    }

    try {
      const response = await fetch(
        `/api/status?jobId=${encodeURIComponent(jobId)}`,
        { cache: "no-store" },
      );

      if (!response.ok || stopped) {
        return;
      }

      const data = (await response.json()) as Partial<JobUpdate> & { state?: string };

      // Re-checked after the await: the download may have finished while this
      // poll was in flight, and a late update must not overwrite its label.
      if (stopped || (data.state !== "queued" && data.state !== "running")) {
        return;
      }

      onUpdate({
        state: data.state,
        phase: data.phase ?? null,
        percent: typeof data.percent === "number" ? data.percent : null,
      });
    } catch {
      // A failed poll only costs a label update; the download is unaffected.
    }
  };

  void tick();
  const timer = window.setInterval(() => void tick(), JOB_POLL_INTERVAL_MS);

  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

function fallbackFileName(title: string, format: AudioFormatChoice): string {
  const safeTitle = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return `${safeTitle || "audio"}.${format === "opus" ? "webm" : format}`;
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.42-1.42M4.92 19.08l1.42-1.42m0-11.32L4.92 4.92m14.16 14.16-1.42-1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.25 14.15A8.5 8.5 0 0 1 9.85 3.75 8.5 8.5 0 1 0 20.25 14.15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<AppStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // What goes into the file tags and name. Prefilled from the video title by
  // lib/metadata.ts, then editable, because the channel is usually the label.
  const [trackArtist, setTrackArtist] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [trimSuggestion, setTrimSuggestion] = useState<TrimSuggestionView | null>(null);
  // Which video the in-flight suggestion belongs to, so a slow answer for the
  // previous track cannot land on the next one.
  const suggestionForRef = useRef<string | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<AudioFormatChoice>("mp3");
  const [quality, setQuality] = useState<QualityChoice>("best");
  const [progress, setProgress] = useState(0);
  const [progressIndeterminate, setProgressIndeterminate] = useState(false);
  const [progressLabel, setProgressLabel] = useState("준비 중");
  const [guideOpen, setGuideOpen] = useState(false);
  const [lastDownload, setLastDownload] = useState<{ fileName: string } | null>(
    null,
  );
  const [theme, setTheme] = useState<Theme>("light");
  // Set when the track came from the explore list, so the download controls
  // render inline under that track instead of in the card at the top.
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  // The url the loaded `info` describes. Editing the input past this point
  // must not let a download go out with the previous track's metadata.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const downloadCompleteTimerRef = useRef<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToResultRef = useRef(false);

  const downloadedIds = useMemo(
    () => new Set(history.map((entry) => entry.videoId)),
    [history],
  );
  const selectedHistory = selectedVideoId
    ? history.find((entry) => entry.videoId === selectedVideoId) ?? null
    : null;

  const isBusy = status === "loading-info" || status === "downloading";
  const canDownload =
    info !== null && !isBusy && loadedUrl !== null && loadedUrl === url.trim();

  const stateLabel = useMemo(() => {
    if (status === "loading-info") {
      return "영상 정보 확인 중";
    }

    if (status === "downloading") {
      return progressLabel;
    }

    if (status === "ready") {
      return "다운로드 대기";
    }

    if (status === "error") {
      return "오류";
    }

    return "대기";
  }, [progressLabel, status]);

  function clearLastDownloadTimer() {
    if (downloadCompleteTimerRef.current) {
      window.clearTimeout(downloadCompleteTimerRef.current);
      downloadCompleteTimerRef.current = null;
    }
  }

  function clearLastDownload() {
    clearLastDownloadTimer();
    setLastDownload(null);
  }

  function scheduleLastDownloadClear() {
    clearLastDownloadTimer();
    downloadCompleteTimerRef.current = window.setTimeout(() => {
      setLastDownload(null);
      downloadCompleteTimerRef.current = null;
    }, 8_000);
  }

  useEffect(() => {
    return () => {
      clearLastDownloadTimer();
    };
  }, []);

  useEffect(() => {
    if (status === "ready" && shouldScrollToResultRef.current) {
      const behavior: ScrollBehavior = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "auto"
        : "smooth";

      resultsRef.current?.scrollIntoView({ behavior, block: "start" });
      shouldScrollToResultRef.current = false;
      return;
    }

    if (status === "error") {
      shouldScrollToResultRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  // Read after mount so the server-rendered markup and the first client render
  // agree; localStorage does not exist during SSR.
  useEffect(() => {
    const storedFormat = readFormat();
    const storedQuality = readQuality();

    if (storedFormat) {
      setFormat(storedFormat);
    }

    if (storedQuality) {
      setQuality(storedQuality);
    }
  }, []);

  function chooseFormat(next: AudioFormatChoice) {
    setFormat(next);
    writeFormat(next);
  }

  function chooseQuality(next: QualityChoice) {
    setQuality(next);
    writeQuality(next);
  }

  async function loadInfo(overrideUrl?: string) {
    const targetUrl = overrideUrl ?? url;

    setStatus("loading-info");
    setError(null);
    setInfo(null);
    setLoadedUrl(null);
    setTrimEnabled(false);
    setTrimStart("");
    setTrimEnd("");
    setTrimSuggestion(null);
    clearLastDownload();
    setProgress(0);
    setProgressIndeterminate(false);
    setProgressLabel("준비 중");

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const videoInfo = (await response.json()) as VideoInfo;
      setInfo(videoInfo);
      const parsed = parseTrackMetadata(videoInfo.title, videoInfo.channel);
      setTrackArtist(parsed.artist);
      setTrackTitle(parsed.title);

      const suggestionFor = extractVideoId(targetUrl);
      suggestionForRef.current = suggestionFor;

      if (suggestionFor) {
        // Best effort: no answer just means no suggestion is offered.
        void fetch(`/api/segments?videoId=${encodeURIComponent(suggestionFor)}`)
          .then((response) => (response.ok ? response.json() : null))
          .then((data: TrimSuggestionView | null) => {
            if (data && suggestionForRef.current === suggestionFor) {
              setTrimSuggestion(data);
            }
          })
          .catch(() => undefined);
      }
      setLoadedUrl(targetUrl.trim());
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(getErrorMessage(loadError));
    }
  }

  function handleTrackSelect(videoId: string) {
    const trackUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setUrl(trackUrl);
    // The panel opens under this track; TrackList brings it into view without
    // pulling the reader away from the list.
    setSelectedVideoId(videoId);
    void loadInfo(trackUrl);
  }

  function handleHistorySelect(videoId: string) {
    const historyUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setUrl(historyUrl);
    // The track may not be in the list on screen, so it opens in the top card.
    setSelectedVideoId(null);
    shouldScrollToResultRef.current = true;
    void loadInfo(historyUrl);
  }

  function clearDownloadHistory() {
    clearHistory();
    setHistory([]);
  }

  function handleUrlSubmit() {
    // A typed url is handled by the card at the top, not the inline panel.
    setSelectedVideoId(null);
    shouldScrollToResultRef.current = true;
    void loadInfo();
  }

  /**
   * One click to re-run whatever just failed. The WARP proxy this server
   * depends on fails intermittently, and a retry usually succeeds, so making
   * the user re-pick a format first was pure friction.
   */
  function retry() {
    if (info && loadedUrl) {
      void download();
      return;
    }

    void loadInfo(url);
  }

  function closeDownloadPanel() {
    setSelectedVideoId(null);
    setInfo(null);
    setLoadedUrl(null);
    setError(null);
    setStatus("idle");
  }

  function toggleTheme() {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }

  async function download() {
    if (!info) {
      return;
    }

    const trimFrom = trimEnabled ? parseTime(trimStart) : null;
    const trimTo = trimEnabled ? parseTime(trimEnd) : null;

    if (Number.isNaN(trimFrom) || Number.isNaN(trimTo)) {
      setError("자를 구간의 시각은 1:23 형식으로 입력하세요.");
      return;
    }

    setStatus("downloading");
    setError(null);
    clearLastDownload();
    setProgress(0);
    setProgressIndeterminate(true);
    setProgressLabel(PROCESSING_LABEL);

    // The server runs one extraction at a time. Polling this job's own state
    // is what lets the bar say "waiting in line" instead of implying work is
    // already underway — the streamed response cannot report it mid-flight.
    const jobId = createJobId();
    const stopWatching = watchJobState(jobId, (job) => {
      const view = describeJob(job, format);
      setProgressLabel(view.label);
      setProgressIndeterminate(view.percent === null);

      if (view.percent !== null) {
        setProgress(view.percent);
      }
    });

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          // Lets the server turn ffmpeg's elapsed time into a percentage.
          duration: info.duration,
          trimStart: trimFrom,
          trimEnd: trimTo,
          url,
          format,
          quality,
          title: trackTitle.trim() || info.title,
          channel: trackArtist.trim() || info.channel,
        }),
      });

      stopWatching();

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
      const hasKnownLength = Number.isFinite(contentLength) && contentLength > 0;
      const reader = response.body?.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;

      setProgress(0);
      setProgressIndeterminate(!hasKnownLength);
      setProgressLabel("파일 다운로드 중");

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (value) {
            const chunk = new Uint8Array(value.byteLength);
            chunk.set(value);
            chunks.push(chunk.buffer);
            received += value.byteLength;

            if (hasKnownLength) {
              setProgress(Math.min(100, Math.round((received / contentLength) * 100)));
            }
          }
        }
      } else {
        chunks.push(await response.arrayBuffer());
        if (hasKnownLength) {
          setProgress(100);
        }
      }

      const blob = new Blob(chunks, {
        type: response.headers.get("Content-Type") ?? "application/octet-stream",
      });
      const fileName =
        parseFileName(response.headers.get("Content-Disposition")) ??
        fallbackFileName(trackArtist.trim() ? `${trackArtist.trim()} - ${trackTitle.trim() || info.title}` : info.title, format);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setLastDownload({ fileName });
      const downloadedId = extractVideoId(url);

      if (downloadedId) {
        setHistory(
          addHistory({
            videoId: downloadedId,
            artist: trackArtist.trim(),
            title: trackTitle.trim() || info.title,
            format,
            at: Date.now(),
          }),
        );
      }
      scheduleLastDownloadClear();
      setProgress(100);
      setProgressIndeterminate(false);
      setProgressLabel("완료");
      window.setTimeout(() => {
        setStatus("ready");
        setProgress(0);
        setProgressIndeterminate(false);
        setProgressLabel("준비 중");
      }, 900);
    } catch (downloadError) {
      setStatus("error");
      setProgress(0);
      setProgressIndeterminate(false);
      setProgressLabel("준비 중");
      setError(getErrorMessage(downloadError));
    } finally {
      stopWatching();
    }
  }

  const trimControls = info ? (
    <TrimControls
      disabled={isBusy}
      duration={info.duration}
      enabled={trimEnabled}
      end={trimEnd}
      onEnabledChange={setTrimEnabled}
      onEndChange={setTrimEnd}
      onStartChange={setTrimStart}
      start={trimStart}
      suggestion={trimSuggestion}
      videoId={loadedUrl ? extractVideoId(loadedUrl) : null}
    />
  ) : null;

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-start gap-6 px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      <header className="grid gap-2 border-b border-[color:var(--border)] pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[color:var(--accent)]">
                Y2V Music
              </p>
              <button
                aria-label={
                  theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-raised)] text-[color:var(--muted)] transition-colors hover:border-[color:var(--control-hover)] hover:text-[color:var(--text)]"
                onClick={toggleTheme}
                type="button"
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
            <h1 className="text-3xl font-bold leading-tight text-[color:var(--text)]">
              YouTube 오디오 추출
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-[color:var(--accent)] bg-[color:var(--accent-soft)] px-3 py-1 text-sm font-bold text-[color:var(--text)] transition-colors hover:bg-[color:var(--accent-soft-hover)]"
              onClick={() => setGuideOpen(true)}
              type="button"
            >
              사용법
            </button>
            <span className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-sm text-[color:var(--muted)]">
              {stateLabel}
            </span>
          </div>
        </div>
      </header>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <section className="grid gap-4 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4">
        <UrlInput
          disabled={isBusy}
          onChange={setUrl}
          onSubmit={handleUrlSubmit}
          value={url}
        />
        {status === "loading-info" && !selectedVideoId ? (
          <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--spinner-border)] border-t-[color:var(--accent)]" />
            영상 정보를 불러오는 중
          </div>
        ) : null}
        {error && !selectedVideoId ? (
          <div className="grid gap-2 rounded-md border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
            <span className="break-words">{error}</span>
            <button
              className="justify-self-start rounded-md border border-[color:var(--danger-border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-bold text-[color:var(--danger-text)] transition-colors hover:bg-[color:var(--danger-soft)]"
              onClick={retry}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}
      </section>

      <DownloadHistory
        disabled={isBusy}
        entries={history}
        onClear={clearDownloadHistory}
        onSelect={handleHistorySelect}
      />

      {info && !selectedVideoId ? (
        <div className="grid gap-6" ref={resultsRef}>
          <VideoInfoCard info={info} />
          <MetadataFields
            artist={trackArtist}
            disabled={isBusy}
            onArtistChange={setTrackArtist}
            onTitleChange={setTrackTitle}
            title={trackTitle}
          />
          <section className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            {trimControls}
          </section>
          <FormatSelector
            disabled={isBusy}
            format={format}
            onFormatChange={chooseFormat}
            onQualityChange={chooseQuality}
            quality={quality}
          />
          <section className="grid gap-4 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-1 text-sm text-[color:var(--muted)]">
              <span className="font-bold text-[color:var(--text)]">
                {format.toUpperCase()} 파일로 저장
              </span>
              <span>
                {format === "opus" || format === "flac"
                  ? "선택한 포맷은 품질 값을 사용하지 않습니다."
                  : `품질: ${quality === "best" ? "최고" : quality === "high" ? "높음" : "보통"}`}
              </span>
            </div>
            <DownloadButton
              disabled={!canDownload}
              downloading={status === "downloading"}
              onClick={download}
            />
          </section>
        </div>
      ) : null}

      <ExploreSection
        disabled={isBusy}
        downloadPanel={
          selectedVideoId ? (
            <DownloadPanel
              trimControls={trimControls}
              alreadyDownloaded={
                selectedHistory
                  ? `이미 ${new Date(selectedHistory.at).toLocaleDateString("ko-KR")}에 ${selectedHistory.format.toUpperCase()}로 받은 곡입니다.`
                  : null
              }
              artist={trackArtist}
              onArtistChange={setTrackArtist}
              onTitleChange={setTrackTitle}
              title={trackTitle}
              busy={isBusy}
              error={error}
              format={format}
              info={info}
              loading={status === "loading-info"}
              onClose={closeDownloadPanel}
              onDownload={download}
              onFormatChange={chooseFormat}
              onQualityChange={chooseQuality}
              onRetry={retry}
              quality={quality}
            />
          ) : null
        }
        downloadedIds={downloadedIds}
        onTrackSelect={handleTrackSelect}
        selectedVideoId={selectedVideoId}
      />

      <DownloadStatusBar
        downloading={status === "downloading"}
        indeterminate={progressIndeterminate}
        label={progressLabel}
        onDismiss={clearLastDownload}
        progress={progress}
        savedFileName={lastDownload?.fileName ?? null}
        trackTitle={info ? (trackArtist ? `${trackArtist} - ${trackTitle}` : trackTitle || info.title) : null}
      />
    </main>
  );
}
