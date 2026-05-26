"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DownloadButton } from "@/components/download-button";
import { ExploreSection } from "@/components/explore/explore-section";
import {
  FormatSelector,
  type AudioFormatChoice,
  type QualityChoice,
} from "@/components/format-selector";
import { GuideModal } from "@/components/guide-modal";
import { PreviewPlayer } from "@/components/preview-player";
import { ProgressBar } from "@/components/progress-bar";
import { UrlInput } from "@/components/url-input";
import { VideoInfoCard } from "@/components/video-info";
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
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<AudioFormatChoice>("mp3");
  const [quality, setQuality] = useState<QualityChoice>("best");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("준비 중");
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const progressTimerRef = useRef<number | null>(null);

  const isBusy = status === "loading-info" || status === "downloading";
  const canDownload = info !== null && !isBusy;

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

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "dark" ? "dark" : "light");
  }, []);

  async function loadInfo(overrideUrl?: string) {
    const targetUrl = overrideUrl ?? url;

    setStatus("loading-info");
    setError(null);
    setInfo(null);

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
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(getErrorMessage(loadError));
    }
  }

  function handleTrackSelect(videoId: string) {
    const trackUrl = `https://www.youtube.com/watch?v=${videoId}`;
    setUrl(trackUrl);
    void loadInfo(trackUrl);
  }

  function handlePreview(videoId: string, title: string, channel: string) {
    setPreviewVideoId(videoId);
    setPreviewTitle(title);
    setPreviewChannel(channel);
  }

  function closePreview() {
    setPreviewVideoId(null);
    setPreviewTitle(null);
    setPreviewChannel(null);
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

    setStatus("downloading");
    setError(null);
    setProgress(8);
    setProgressLabel("오디오 스트림 준비 중");

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 84) {
          return current;
        }

        return Math.min(84, current + Math.max(1, Math.round((84 - current) * 0.08)));
      });
    }, 700);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          format,
          quality,
        }),
      });

      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const contentLength = Number(response.headers.get("Content-Length") ?? 0);
      const reader = response.body?.getReader();
      const chunks: BlobPart[] = [];
      let received = 0;

      setProgressLabel("파일 수신 중");

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
            setProgress((current) => {
              if (contentLength > 0) {
                return Math.min(99, 85 + Math.round((received / contentLength) * 14));
              }

              return Math.min(98, current + 2);
            });
          }
        }
      } else {
        chunks.push(await response.arrayBuffer());
      }

      const blob = new Blob(chunks, {
        type: response.headers.get("Content-Type") ?? "application/octet-stream",
      });
      const fileName =
        parseFileName(response.headers.get("Content-Disposition")) ??
        fallbackFileName(info.title, format);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setProgress(100);
      setProgressLabel("완료");
      window.setTimeout(() => {
        setStatus("ready");
        setProgress(0);
        setProgressLabel("준비 중");
      }, 900);
    } catch (downloadError) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setStatus("error");
      setProgress(0);
      setProgressLabel("준비 중");
      setError(getErrorMessage(downloadError));
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-start gap-6 px-4 py-8 sm:px-6 lg:px-8">
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
          onSubmit={loadInfo}
          value={url}
        />
        {status === "loading-info" ? (
          <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--spinner-border)] border-t-[color:var(--accent)]" />
            영상 정보를 불러오는 중
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-[color:var(--danger-border)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
            {error}
          </div>
        ) : null}
      </section>

      {info ? (
        <>
          <VideoInfoCard info={info} />
          <FormatSelector
            disabled={isBusy}
            format={format}
            onFormatChange={setFormat}
            onQualityChange={setQuality}
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
            {status === "downloading" ? (
              <div className="md:col-span-2">
                <ProgressBar label={progressLabel} value={progress} />
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {previewVideoId ? (
        <PreviewPlayer
          channel={previewChannel}
          onClose={closePreview}
          title={previewTitle}
          videoId={previewVideoId}
        />
      ) : null}

      <ExploreSection
        disabled={isBusy}
        onPreview={handlePreview}
        onTrackSelect={handleTrackSelect}
      />
    </main>
  );
}
