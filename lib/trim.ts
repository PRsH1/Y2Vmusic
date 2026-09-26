/**
 * Shared by the panel (parsing what the listener types) and the download route
 * (re-checking it — the values arrive in the request body, so they are input).
 */

export type TrimRange = {
  start: number;
  /** null means "to the end of the track". */
  end: number | null;
};

/** "1:23", "83" or "1:02:03" to seconds. Empty is null; unreadable is NaN. */
export function parseTime(text: string): number | null {
  const value = text.trim();

  if (!value) {
    return null;
  }

  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d+)?$/.test(value)) {
    return Number.NaN;
  }

  return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = String(safe % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export type TrimCheck =
  | { ok: true; range: TrimRange | null }
  | { ok: false; reason: string };

/**
 * Normalizes a requested range. `range: null` means nothing to cut. Shorter
 * than a second is refused: it is almost always a typo, and the result would
 * be an empty-sounding file that looks like a failure.
 */
export function checkTrim(
  start: unknown,
  end: unknown,
  duration: number | null,
  maxSeconds: number,
): TrimCheck {
  const isTime = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= maxSeconds;

  if (start != null && !isTime(start)) {
    return { ok: false, reason: "시작 시각이 올바르지 않습니다." };
  }

  if (end != null && !isTime(end)) {
    return { ok: false, reason: "끝 시각이 올바르지 않습니다." };
  }

  const from = start ?? 0;
  let to = end ?? null;

  if (duration) {
    if (from >= duration) {
      return { ok: false, reason: "시작 시각이 곡 길이를 넘습니다." };
    }

    // An end at or past the real length is the same as "to the end".
    if (to !== null && to >= duration) {
      to = null;
    }
  }

  if (from === 0 && to === null) {
    return { ok: true, range: null };
  }

  if (to !== null && to - from < 1) {
    return { ok: false, reason: "잘라낸 구간이 1초보다 짧습니다." };
  }

  return { ok: true, range: { start: from, end: to } };
}
