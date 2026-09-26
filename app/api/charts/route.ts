import { BusyError, metadataAdmission } from "@/lib/admission";
import {
  getCached,
  getStale,
  setCache,
  type CacheHit,
} from "@/lib/chart-cache";
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

/**
 * `cachedAt` is the moment the snapshot was fetched from YouTube, not the
 * moment this response was built. It used to be `new Date()` on every hit,
 * which made a two-hour-old list look freshly collected.
 */
function chartResponse(hit: CacheHit) {
  return Response.json(
    {
      tracks: hit.tracks,
      cachedAt: new Date(hit.cachedAt).toISOString(),
      stale: hit.stale,
    },
    {
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
    return chartResponse(cached);
  }

  try {
    // The API source is a plain HTTPS call to googleapis and costs this box
    // nothing, so only the yt-dlp source takes a slot.
    const tracks =
      playlist.source === "youtube-api"
        ? await fetchPlaylistFromApi(playlistId)
        : await metadataAdmission.run(() => fetchPlaylistFromYtDlp(playlistId));

    setCache(playlistId, tracks);

    return chartResponse({ tracks, cachedAt: Date.now(), stale: false });
  } catch (error) {
    // A weekly chart that is a few hours stale is worth far more than an
    // error page, and the WARP proxy this server reaches YouTube through
    // fails intermittently. Only fall through when there is nothing to serve.
    const stale = getStale(playlistId);

    if (stale) {
      console.warn(
        `[charts] serving stale ${playlistId} after refresh failure: ${getCliErrorMessage(error)}`,
      );
      return chartResponse(stale);
    }

    if (error instanceof BusyError) {
      return Response.json(
        { error: error.message },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    return jsonError(
      `차트를 불러오지 못했습니다. ${getCliErrorMessage(error)}`,
      500,
    );
  }
}
