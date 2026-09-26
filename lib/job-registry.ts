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

type Entry = {
  state: JobState;
  since: number;
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
  jobs.set(id, { state, since: Date.now() });
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
