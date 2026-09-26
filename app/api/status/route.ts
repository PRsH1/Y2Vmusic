import { downloadAdmission } from "@/lib/admission";
import { getJob, isValidJobId } from "@/lib/job-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lets a client in the middle of a download ask whether its job is waiting
 * for a slot or already being processed. Deliberately cheap — no subprocess,
 * no admission slot — so polling it never competes with the work it reports on.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId")?.trim() ?? "";
  const stats = downloadAdmission.stats;
  const job = isValidJobId(jobId) ? getJob(jobId) : null;

  return Response.json(
    {
      state: job?.state ?? "unknown",
      phase: job?.phase ?? null,
      percent: job?.percent ?? null,
      active: stats.active,
      queued: stats.queued,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
