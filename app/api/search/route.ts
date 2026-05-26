import { getCliErrorMessage } from "@/lib/process";
import { searchYouTube } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type SearchRequest = {
  query?: unknown;
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
  let body: SearchRequest | null = null;

  try {
    body = (await request.json()) as SearchRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query) {
    return jsonError("검색어를 입력하세요.", 400);
  }

  if (query.length > 100) {
    return jsonError("검색어는 100자 이하로 입력하세요.", 400);
  }

  try {
    const results = await searchYouTube(query);

    return Response.json(
      { results },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(`검색을 처리하지 못했습니다. ${getCliErrorMessage(error)}`, 500);
  }
}
