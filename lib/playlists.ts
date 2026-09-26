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
    // Was "Korean R&B Hits 2024" (RDCLAK5uy_ksS_...), a year retrospective
    // whose newest track was added 2025-12-30 — the reason the same older
    // songs kept coming back. This one is not year-locked and had tracks
    // added 2026-09-04. It overlaps the 힙합 tab by only 2 of 90 songs.
    id: "RDCLAK5uy_kT-sIJz2O-hpkxwjosN2hMt9Y5xevcPYI",
    label: "R&B",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Chill Korean Hip-Hop/R&B",
  },
  {
    id: "RDCLAK5uy_kkkmhZXFpAZyn2AQ8GmnHfS1lP70KvHmE",
    label: "발라드",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Touching Korean Ballad",
  },
  {
    // Was "Seoul Cafe" (RDCLAK5uy_k8Jk...), which its own description called
    // "a curated collection of K-pop folk and ballads" — HWASA, ROSÉ,
    // BLACKPINK, BIGBANG. Mainstream K-pop under an 인디 label. This one is
    // actually indie (wave to earth, 한로로) and had tracks added 2026-09-18.
    id: "RDCLAK5uy_lRJL69-EgXkWeTAXA3v__oMk-3IWf2NA0",
    label: "인디",
    source: "yt-dlp",
    kind: "mix",
    sourceName: "Cafe Korean Indie Music",
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
