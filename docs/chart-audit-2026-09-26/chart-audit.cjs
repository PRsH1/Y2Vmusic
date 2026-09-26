const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const definitions = [...fs.readFileSync('lib/playlists.ts', 'utf8').matchAll(/id: "([^"]+)",\s+label: "([^"]+)",\s+source: "([^"]+)"/g)]
  .map(([, id, label, source]) => ({ id, label, source }));
const results = fs.existsSync('temp/chart-audit-results.json') ? JSON.parse(fs.readFileSync('temp/chart-audit-results.json', 'utf8')).results : [];
const sourceOnly = process.argv.includes('--source-only');
async function production(id) {
  const response = await fetch(`https://y2vmusic.duckdns.org/api/charts?id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(50000) });
  const data = await response.json();
  return { status: response.status, cacheControl: response.headers.get('cache-control'), serverDate: response.headers.get('date'), ...data };
}
async function audit(definition) {
  const item = { ...results.find(result => result.id === definition.id), ...definition, checkedAt: new Date().toISOString() };
  const checks = await Promise.allSettled([
    sourceOnly ? Promise.resolve(null) : production(definition.id),
    run('yt-dlp', ['--ignore-config', '--no-update', '--flat-playlist', '--dump-single-json', '--skip-download', '--socket-timeout', '15', '--retries', '0', `https://www.youtube.com/playlist?list=${definition.id}`], { encoding: 'utf8', timeout: 50000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }),
  ]);
  if (checks[0].status === 'fulfilled' && checks[0].value) item.production = checks[0].value;
  else if (checks[0].status === 'rejected') item.productionError = checks[0].reason.message;
  if (checks[1].status === 'fulfilled') {
    const source = JSON.parse(checks[1].value.stdout);
    item.original = { title: source.title, description: source.description, channel: source.channel, channelId: source.channel_id, modifiedDate: source.modified_date, count: source.entries?.length, tracks: (source.entries ?? []).map((entry, index) => ({ rank: index + 1, videoId: entry.id, title: entry.title })) };
    const actual = item.production?.tracks;
    if (actual) {
      const expected = item.original.tracks;
      item.comparison = { countEqual: actual.length === expected.length, sameIdsInOrder: actual.length === expected.length && actual.every((entry, i) => entry.videoId === expected[i].videoId), differences: actual.flatMap((entry, i) => entry.videoId === expected[i]?.videoId ? [] : [{ rank: i + 1, actual: entry.videoId, expected: expected[i]?.videoId }]) };
    }
  } else item.originalError = checks[1].reason.message;
  const existing = results.findIndex(result => result.id === item.id);
  if (existing >= 0) results[existing] = item;
  else results.push(item);
  fs.writeFileSync('temp/chart-audit-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify({ label: item.label, status: item.production?.status, count: item.production?.tracks?.length, originalTitle: item.original?.title, description: item.original?.description, channel: item.original?.channel, modifiedDate: item.original?.modifiedDate, originalCount: item.original?.count, comparison: item.comparison, productionError: item.productionError, originalError: item.originalError, top3: item.production?.tracks?.slice(0, 3).map(t => ({ rank: t.rank, title: t.title, videoId: t.videoId })) }));
}
(async () => {
  const selected = process.argv[2] ? definitions.filter((_, index) => process.argv[2].split(',').includes(String(index))) : definitions;
  for (const definition of selected) await audit(definition);
  if (sourceOnly) return;
  const first = results[0];
  const repeated = await production(first.id);
  const repeatCheck = { id: first.id, firstCachedAt: first.production?.cachedAt, secondCachedAt: repeated.cachedAt, sameTracks: JSON.stringify(first.production?.tracks) === JSON.stringify(repeated.tracks) };
  fs.writeFileSync('temp/chart-audit-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), results, repeatCheck }, null, 2));
  console.log(JSON.stringify({ repeatCheck }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
