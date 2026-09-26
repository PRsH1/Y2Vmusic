export type PlaylistDef = {
  id: string;
  label: string;
  source: "youtube-api" | "yt-dlp";
  /**
   * "chart" is an actual ranked weekly list, so its numbering means something.
   * "mix" is an editorial selection — numbering it would imply a popularity
   * ranking that was never computed (the number is just list order).
   */
  kind: "chart" | "mix";
  /** The upstream playlist's own name, shown so the tab cannot mislead. */
  sourceName: string;
};

export const PLAYLISTS: PlaylistDef[] = [
  {
    id: "PL4fGSI1pDJn6jXS_Tv_N9B8Z0HTRVJE0m",
    label: "한국 주간 Top 100",
    source: "youtube-api",
    kind: "chart",
    sourceName: "Top 100 Songs South Korea",
  },
  {
    id: "PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i",
    label: "글로벌 주간 Top 100",
    source: "youtube-api",
    kind: "chart",
    sourceName: "Top 100 Songs Global",
  },
  {
    id: "PL4fGSI1pDJn4-UIb6RKHdxam-oAUULIGB",
    label: "일본 주간 Top 100",
    source: "youtube-api",
    kind: "chart",
    sourceName: "Top 100 Songs Japan",
  },
  {
    id: "RDCLAK5uy_l7wbVbkC-dG5fyEQQsBfjm_z3dLAhYyvo",
    label: "K-Pop",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "K-HITLIST",
  },
  {
    id: "RDCLAK5uy_nbK9qSkqYZvtMXH1fLCMmC1yn8HEm0W90",
    label: "J-Pop",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "J-Hits!",
  },
  {
    id: "RDCLAK5uy_nEcCeflWNpzQNRExtAKjKkkX96wjom9Nc",
    label: "힙합",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Korean Hip-Hop: Turn Up Seoul",
  },
  {
    id: "RDCLAK5uy_ksS_w6iD9_BbnCccQrUOq5oawpqNcOGZ4",
    label: "R&B",
    source: "yt-dlp",
    kind: "mix",
    // A 2024 retrospective, not a current R&B ranking. Named here so the
    // screen can say so rather than leaving people to wonder why the same
    // older songs keep appearing.
    sourceName: "Korean R&B Hits 2024",
  },
  {
    id: "RDCLAK5uy_kkkmhZXFpAZyn2AQ8GmnHfS1lP70KvHmE",
    label: "발라드",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Touching Korean Ballad",
  },
  {
    id: "RDCLAK5uy_k8JkYuMnVs1DbA2yZlj4gNVWY1CLAp_sQ",
    label: "인디",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Seoul Cafe",
  },
  {
    id: "RDCLAK5uy_mgqzBJZr84DG9MvViJ5dgClLG6QdGuXcw",
    label: "록",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Korean Rock & Metal",
  },
  {
    id: "RDCLAK5uy_kSZ85qHgyyqQCKkCtrjbA3m8Am7GfOTcQ",
    label: "OST",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "K-Drama Soundtracks",
  },
  {
    id: "RDCLAK5uy_nhIX70PxxmJBdgJ_cdC6NEw2m8deiEdOU",
    label: "트로트",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Earworm Korean Trot",
  },
];

export function isAllowedPlaylist(id: string): boolean {
  return PLAYLISTS.some((playlist) => playlist.id === id);
}

export function getPlaylist(id: string): PlaylistDef | null {
  return PLAYLISTS.find((playlist) => playlist.id === id) ?? null;
}
