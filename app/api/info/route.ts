import { getCliErrorMessage } from "@/lib/process";
import { isValidYouTubeUrl } from "@/lib/validate";
import { getVideoInfo } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type InfoRequest = {
  url?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  let body: InfoRequest | null = null;

  try {
    body = (await request.json()) as InfoRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!isValidYouTubeUrl(url)) {
    return jsonError("지원하는 YouTube 영상 URL을 입력하세요.", 400);
  }

  try {
    const info = await getVideoInfo(url);
    return Response.json(info, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(`영상 정보를 가져오지 못했습니다. ${getCliErrorMessage(error)}`, 500);
  }
}
