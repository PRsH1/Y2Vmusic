import { fetchTrimSuggestion } from "@/lib/sponsorblock";
import { isValidVideoId } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Suggested trim for a video. Always 200: no suggestion is a normal answer. */
export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId")?.trim() ?? "";

  if (!isValidVideoId(videoId)) {
    return Response.json({ error: "올바른 영상 ID가 아닙니다." }, { status: 400 });
  }

  return Response.json(await fetchTrimSuggestion(videoId), {
    headers: { "Cache-Control": "no-store" },
  });
}
