/**
 * Derives an artist and a clean title from a YouTube video title.
 *
 * YouTube gives us the uploader channel, not the artist. For music videos that
 * is usually the label — "HYBE LABELS", "KQ ENTERTAINMENT", "이지금 [IU
 * Official]" — and it went straight into the ID3 artist tag, so a downloaded
 * library filled up with record labels as artists and every title ended in
 * "Official MV". Most music-video titles carry the real artist in a small set
 * of shapes, which is what this reads. It is a best guess: the download panel
 * lets the listener correct it before saving.
 */

export type TrackMetadata = {
  artist: string;
  title: string;
};

/** Words that mark a bracketed group as video packaging rather than title. */
const NOISE_GROUP =
  /official|\bm\/?v\b|music video|\bvideo\b|lyrics?|\baudio\b|visuali[sz]er|remaster|\b4k\b|\bhd\b|color coded|teaser/i;

const TRAILING_NOISE = [
  /\s*[-|:]?\s*official\s+music\s+video\s*$/i,
  /\s*[-|:]?\s*(?:official\s+)?(?:m\/v|mv)\s*$/i,
  /\s*[-|:]?\s*official\s+(?:video|audio)\s*$/i,
  /\s*[-|:]?\s*special\s+video\s*$/i,
  /\s*[-|:]?\s*official\s*$/i,
];

const QUOTE_OPEN = `'‘"“「『`;
const QUOTE_CLOSE = `'’"”」』`;

function stripNoise(value: string): string {
  let text = value
    // "Title | extra context" — the part after the pipe is never the title.
    .replace(/\s+\|\s+.*$/, "")
    // Bracketed groups that describe the video, not the song. "(feat. X)"
    // and "(D.O.)" survive because they carry none of the noise words.
    .replace(/[([【]([^)\]】]*)[)\]】]/g, (group, inner: string) =>
      NOISE_GROUP.test(inner) ? "" : group,
    );

  let previous = "";

  while (previous !== text) {
    previous = text;

    for (const pattern of TRAILING_NOISE) {
      text = text.replace(pattern, "");
    }
  }

  return text.replace(/\s{2,}/g, " ").trim();
}

function unquote(value: string): string {
  const text = value.trim();

  if (
    text.length >= 2 &&
    QUOTE_OPEN.includes(text[0] ?? "") &&
    QUOTE_CLOSE.includes(text[text.length - 1] ?? "")
  ) {
    return text.slice(1, -1).trim();
  }

  return text;
}

/**
 * Pulls a leading quoted segment out of a title: "‘BiiiG’ DANCE PRACTICE"
 * becomes "BiiiG DANCE PRACTICE", keeping whatever follows the quote.
 */
function liftQuoted(value: string): string {
  const match = new RegExp(`^[${QUOTE_OPEN}](.+?)[${QUOTE_CLOSE}]\s*(.*)$`).exec(value);

  if (!match) {
    return unquote(value);
  }

  const rest = stripNoise(match[2] ?? "");
  return [match[1]?.trim(), rest].filter(Boolean).join(" ");
}

/**
 * The channel as a fallback artist, minus the decorations channels add:
 * "BTS - Topic", "이지금 [IU Official]", "JennieRubyJaneVEVO".
 */
export function cleanChannel(channel: string): string {
  return channel
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/, "")
    .replace(/\s*[[(【][^\])】]*[\])】]\s*/g, " ")
    .replace(/\s*\bofficial\b\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseTrackMetadata(rawTitle: string, channel: string): TrackMetadata {
  const fallbackArtist = cleanChannel(channel) || channel.trim();

  // Leading "[MV]" / "【MV】" tags come before the artist, so they go first.
  const title = rawTitle
    .trim()
    .replace(/^\s*[[【(]\s*(?:official\s+)?(?:m\/?v|mv|teaser|lyrics?)\s*[\]】)]\s*/i, "");

  // "Artist - Title", and the older "[MV] Artist _ Title" form.
  const separated = /^(.+?)\s+[-–—_]\s+(.+)$/.exec(title);

  if (separated) {
    const artist = stripNoise(separated[1] ?? "");
    const song = liftQuoted(stripNoise(separated[2] ?? ""));

    if (artist && song) {
      return { artist, title: song };
    }
  }

  // "Artist 'Title' Official MV" — the quoted run is the title.
  const quoted = new RegExp(
    `^(.+?)\s*[${QUOTE_OPEN}](.+?)[${QUOTE_CLOSE}]\s*(.*)$`,
  ).exec(title);

  if (quoted) {
    const artist = stripNoise(quoted[1] ?? "");
    const rest = stripNoise(quoted[3] ?? "");
    const song = [quoted[2]?.trim(), rest].filter(Boolean).join(" ");

    if (artist && song) {
      return { artist, title: song };
    }
  }

  return {
    artist: fallbackArtist,
    title: stripNoise(title) || title,
  };
}
