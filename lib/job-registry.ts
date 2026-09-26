/**
 * Tracks whether a client's download is waiting for a slot or actually
 * running, so the UI can say which.
 *
 * The download response is a single stream — the server cannot tell the
 * client "you are queued" partway through it. The client therefore sends a
 * job id with the request and polls /api/status for that id. Aggregate queue
 * counts would not do: with one slot and two outstanding requests, a client
 * cannot tell from counts alone whether it is the one running.
 */

export type JobState = "queued" | "running";

/**
 * What a running job is doing. "preparing" covers yt-dlp resolving the video
 * and solving YouTube's JS challenge, which reports no progress at all — the
 * UI shows that stretch as indeterminate rather than inventing a number.
 */
export type JobPhase = "preparing" | "downloading" | "converting";

export type JobSnapshot = {
  state: JobState;
  phase: JobPhase | null;
  /** 0-100 within the current phase, or null while it cannot be measured. */
  percent: number | null;
};

type Entry = {
  state: JobState;
  since: number;
  phase: JobPhase | null;
  percent: number | null;
};

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STALE_AFTER_MS = 60 * 60_000;
const MAX_ENTRIES = 200;

const jobs = new Map<string, Entry>();

export function isValidJobId(value: unknown): value is string {
  return typeof value === "string" && JOB_ID_PATTERN.test(value);
}

function sweep(): void {
  const cutoff = Date.now() - STALE_AFTER_MS;

  for (const [id, entry] of jobs) {
    if (entry.since < cutoff) {
      jobs.delete(id);
    }
  }

  // Ids come from the request body, so the map is bounded explicitly rather
  // than trusting callers to always clear. Map preserves insertion order, so
  // the oldest entries go first.
  while (jobs.size > MAX_ENTRIES) {
    const oldest = jobs.keys().next();

    if (oldest.done) {
      break;
    }

    jobs.delete(oldest.value);
  }
}

export function markJob(id: string, state: JobState): void {
  jobs.delete(id);
  jobs.set(id, {
    state,
    since: Date.now(),
    phase: state === "running" ? "preparing" : null,
    percent: null,
  });
  sweep();
}

export function clearJob(id: string | undefined): void {
  if (id) {
    jobs.delete(id);
  }
}

export function getJobState(id: string): JobState | null {
  return jobs.get(id)?.state ?? null;
}

/**
 * Records progress for a job that is already registered. Unknown ids are
 * ignored rather than created, so a late callback from a finished job cannot
 * resurrect its entry.
 */
export function updateJobProgress(id: string, phase: JobPhase, fraction: number | null): void {
  const entry = jobs.get(id);

  if (!entry) {
    return;
  }

  entry.phase = phase;
  entry.percent = fraction === null ? null : Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

export function getJob(id: string): JobSnapshot | null {
  const entry = jobs.get(id);
  return entry ? { state: entry.state, phase: entry.phase, percent: entry.percent } : null;
}
