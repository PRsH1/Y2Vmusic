export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { sweepStaleJobs } = await import("@/lib/temp");
  const removed = sweepStaleJobs();

  if (removed > 0) {
    console.info(`[temp] swept ${removed} stale job(s) at startup`);
  }
}
