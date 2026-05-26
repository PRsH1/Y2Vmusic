export type PlaylistDef = {
  id: string;
  label: string;
  source: "youtube-api" | "yt-dlp";
};

export const PLAYLISTS: PlaylistDef[] = [
  {
    id: "PL4fGSI1pDJn6jXS_Tv_N9B8Z0HTRVJE0m",
    label: "한국 Top 100",
    source: "youtube-api",
  },
  {
    id: "PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i",
    label: "글로벌 Top 100",
    source: "youtube-api",
  },
  {
    id: "RDCLAK5uy_l7wbVbkC-dG5fyEQQsBfjm_z3dLAhYyvo",
    label: "K-Pop",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_nEcCeflWNpzQNRExtAKjKkkX96wjom9Nc",
    label: "힙합",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_ksS_w6iD9_BbnCccQrUOq5oawpqNcOGZ4",
    label: "R&B",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_kkkmhZXFpAZyn2AQ8GmnHfS1lP70KvHmE",
    label: "발라드",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_k8JkYuMnVs1DbA2yZlj4gNVWY1CLAp_sQ",
    label: "인디",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_mgqzBJZr84DG9MvViJ5dgClLG6QdGuXcw",
    label: "록",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_kSZ85qHgyyqQCKkCtrjbA3m8Am7GfOTcQ",
    label: "OST",
    source: "yt-dlp",
  },
  {
    id: "RDCLAK5uy_nhIX70PxxmJBdgJ_cdC6NEw2m8deiEdOU",
    label: "트로트",
    source: "yt-dlp",
  },
];

export function isAllowedPlaylist(id: string): boolean {
  return PLAYLISTS.some((playlist) => playlist.id === id);
}

export function getPlaylist(id: string): PlaylistDef | null {
  return PLAYLISTS.find((playlist) => playlist.id === id) ?? null;
}
