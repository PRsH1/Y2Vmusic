/**
 * Verifies every chart ID in lib/playlists.ts still resolves on YouTube.
 *
 * The RDCLAK5uy_ ids are YouTube Music's auto-generated mixes: they can be
 * retired or quietly re-themed with no warning, and a dead one turns its tab
 * into an error (the stale cache covers only 24 hours). Renaming is the
 * sneakier failure — the id keeps working while the content drifts from what
 * the tab claims, which is how the R&B tab ended up serving a 2024
 * retrospective.
 *
 * Two endpoints are used on purpose. `playlists.list` is the only one that
 * returns a title, but its visibility of auto-generated playlists is
 * inconsistent: of three live RDCLAK ids checked here, it returned one and
 * claimed the other two did not exist. So liveness is decided by
 * `playlistItems`, which answered for all of them, and the title check runs
 * only on the ids `playlists.list` happens to know.
 *
 * Usage:  pnpm check:playlists
 * Needs YOUTUBE_API_KEY (environment or .env.local). About 13 quota units.
 */
import { readFileSync } from "node:fs";
import { PLAYLISTS } from "../lib/playlists.ts";

function apiKey() {
  if (process.env.YOUTUBE_API_KEY) {
    return process.env.YOUTUBE_API_KEY.trim();
  }

  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("YOUTUBE_API_KEY="));
    return line?.slice("YOUTUBE_API_KEY=".length).replace(/^["']|["']$/g, "").trim() ?? "";
  } catch {
    return "";
  }
}

const key = apiKey();

if (!key) {
  console.error("YOUTUBE_API_KEY가 없습니다 (환경 변수 또는 .env.local).");
  process.exit(2);
}

function decode(title) {
  return title
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Titles for whichever ids playlists.list is willing to admit exist. */
async function fetchTitles() {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", PLAYLISTS.map((p) => p.id).join(","));
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", key);

  const data = await (await fetch(url)).json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return new Map(
    (data.items ?? []).map((item) => [item.id, decode(item.snippet?.title ?? "")]),
  );
}

/** Liveness and size. Returns null when the playlist cannot be read at all. */
async function fetchLiveness(id) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "id");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("playlistId", id);
  url.searchParams.set("key", key);

  const data = await (await fetch(url)).json();

  if (data.error || !(data.pageInfo?.totalResults > 0)) {
    return null;
  }

  return data.pageInfo.totalResults;
}

const titles = await fetchTitles();

let dead = 0;
let drifted = 0;
let unverified = 0;

for (const playlist of PLAYLISTS) {
  const count = await fetchLiveness(playlist.id);

  if (count === null) {
    dead += 1;
    console.log(`DEAD     ${playlist.label.padEnd(16)} ${playlist.id}`);
    continue;
  }

  const title = titles.get(playlist.id);

  if (title === undefined) {
    unverified += 1;
    console.log(
      `OK(이름?) ${playlist.label.padEnd(15)} ${String(count).padStart(4)}곡  이름 확인 불가 · 기록: ${playlist.sourceName}`,
    );
    continue;
  }

  if (title !== playlist.sourceName) {
    drifted += 1;
    console.log(`RENAMED  ${playlist.label.padEnd(16)} 기록: ${playlist.sourceName}`);
    console.log(`         ${"".padEnd(16)} 실제: ${title}`);
    continue;
  }

  console.log(`OK       ${playlist.label.padEnd(16)} ${String(count).padStart(4)}곡  ${title}`);
}

console.log(
  `\n확인 ${PLAYLISTS.length}개 · 정상 ${PLAYLISTS.length - dead - drifted - unverified} · 이름미확인 ${unverified} · 이름변경 ${drifted} · 소멸 ${dead}`,
);

if (dead || drifted) {
  console.log("\nlib/playlists.ts 를 점검하세요. 소멸한 ID는 해당 탭이 오류가 되고,");
  console.log("이름이 바뀐 ID는 탭 라벨이 실제 내용과 어긋납니다.");
  process.exit(1);
}
