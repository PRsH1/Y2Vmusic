import { getCached, setCache } from "@/lib/chart-cache";
import { getPlaylist, isAllowedPlaylist } from "@/lib/playlists";
import { getCliErrorMessage } from "@/lib/process";
import { fetchPlaylistFromApi } from "@/lib/youtube-api";
import { fetchPlaylistFromYtDlp } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("id")?.trim() ?? "";

  if (!isAllowedPlaylist(playlistId)) {
    return jsonError("지원하지 않는 차트입니다.", 400);
  }

  const playlist = getPlaylist(playlistId);

  if (!playlist) {
    return jsonError("지원하지 않는 차트입니다.", 400);
  }

  const cached = getCached(playlistId);

  if (cached) {
    return Response.json(
      {
        tracks: cached,
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const tracks =
      playlist.source === "youtube-api"
        ? await fetchPlaylistFromApi(playlistId)
        : await fetchPlaylistFromYtDlp(playlistId);

    setCache(playlistId, tracks);

    return Response.json(
      {
        tracks,
        cachedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(
      `차트를 불러오지 못했습니다. ${getCliErrorMessage(error)}`,
      500,
    );
  }
}
