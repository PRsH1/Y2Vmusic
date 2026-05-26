export type ChartTrack = {
  rank: number;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  duration: string | null;
};

type YouTubePlaylistItemsResponse = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      videoOwnerChannelTitle?: string;
      channelTitle?: string;
      resourceId?: {
        videoId?: string;
      };
      thumbnails?: {
        default?: {
          url?: string;
        };
      };
    };
  }>;
  error?: {
    message?: string;
  };
};

const PLAYLIST_ITEMS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlistItems";

export async function fetchPlaylistFromApi(
  playlistId: string,
): Promise<ChartTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const tracks: ChartTrack[] = [];
  let pageToken: string | undefined;

  while (tracks.length < 100) {
    const url = new URL(PLAYLIST_ITEMS_ENDPOINT);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url);
    const data = (await response.json()) as YouTubePlaylistItemsResponse;

    if (!response.ok) {
      throw new Error(
        data.error?.message ?? "YouTube 차트를 불러오지 못했습니다.",
      );
    }

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId?.trim() ?? "";

      if (!videoId) {
        continue;
      }

      tracks.push({
        rank: tracks.length + 1,
        videoId,
        title: snippet?.title?.trim() || "제목 없음",
        channel:
          snippet?.videoOwnerChannelTitle?.trim() ||
          snippet?.channelTitle?.trim() ||
          "알 수 없음",
        thumbnail: snippet?.thumbnails?.default?.url ?? null,
        duration: null,
      });

      if (tracks.length >= 100) {
        break;
      }
    }

    if (!data.nextPageToken) {
      break;
    }

    pageToken = data.nextPageToken;
  }

  return tracks;
}
