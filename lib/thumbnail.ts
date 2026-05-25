import { writeFile } from "node:fs/promises";
import { createTempPath } from "@/lib/temp";

/**
 * Downloads a thumbnail image and converts it to JPEG for album art embedding.
 * Returns the path to the downloaded file, or null on failure.
 */
export async function downloadThumbnail(
  url: string,
): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tempPath = createTempPath("jpg");
    await writeFile(tempPath, buffer);
    return tempPath;
  } catch {
    return null;
  }
}
