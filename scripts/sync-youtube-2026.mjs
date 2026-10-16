// Synchronize the 2026 student demo archive with the official YouTube channel.
// Titles, not guessed student identities, determine whether an upload is a
// project/practice iteration or a final graduation work.
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data/showcase-videos.json");
const CHANNEL = "https://www.youtube.com/@kopo-poly/videos";
const JULY = "2026-07-01";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CONFIRMED_LINKS = path.join(ROOT, "data/2026-confirmed-video-links.json");
const EXPECTED_GRADUATION_WORKS = 16;
const titleKey = title => String(title || "").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[^a-z0-9가-힣]/g, "");

async function youtube(args, timeout = 180000) {
  const { stdout } = await run("yt-dlp", [
    "--no-warnings", "--ignore-errors", "--js-runtimes", "node",
    ...args,
  ], { maxBuffer: 28 * 1024 * 1024, timeout });
  return JSON.parse(stdout);
}
function toDate(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "").slice(0, 8);
  return digits.length === 8
    ? `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`
    : "";
}
function classification(title, date, fallback = "") {
  const text = String(title || "").normalize("NFKC");
  // Explicit source title always wins, even for the same student/team.
  if (/졸업\s*작품/.test(text)) return "graduate";
  if (/프로젝트|project\s*(?:demo|presentation)|프로젝트\s*실습/i.test(text)) return "practice";
  if (date?.startsWith("2026") && date.slice(0,10) < JULY) return "practice";
  return fallback;
}
function workTitle(source) {
  const original = String(source || "").trim();
  // School prefixes often contain hyphens. The actual work title is the
  // portion after the LAST explicit work-type separator.
  const match = [...original.matchAll(/(?:졸업\s*작품|프로젝트(?:\s*실습)?)\s*[-–—:|]\s*/gi)].at(-1);
  const sourceTitle = match ? original.slice(match.index + match[0].length) : original;
  const cleaned = String(sourceTitle || "")
    .replace(/(?:^|[|\[\(\-–—:]\s*)?(?:2026\s*년?\s*)?졸업\s*작품(?:\s*시연)?\s*/gi, " ")
    .replace(/(?:^|[|\[\(\-–—:]\s*)?(?:2026\s*년?\s*)?프로젝트(?:\s*실습)?\s*/gi, " ")
    .replace(/\b2026\s*년?\b/g, " ")
    .replace(/(?:시연\s*영상|발표\s*영상)\s*$/g, " ")
    .replace(/^[\s|\[\](){}:–—\-]+|[\s|\[\](){}:–—\-]+$/g, "")
    .trim();
  return (cleaned || String(source).trim()).slice(0, 100);
}
function safeDescription(value) {
  const lines = String(value || "").replace(/\r/g, "").split("\n")
    .filter(line => !/^\s*(?:개발자|제작자|작성자|이름|성명|연락처|전화|이메일|e-mail|github|깃허브|블로그|홈페이지)\s*[:：]/i.test(line))
    .map(line => line.replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "").trim())
    .filter(line => !/^\s*(?:#\S+\s*)+$/.test(line));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000);
}
async function main() {
  let playlist = {entries: []};
  try {
    playlist = await youtube(["--flat-playlist", "--dump-single-json", "--playlist-end", "90", CHANNEL]);
  } catch (error) {
    console.warn("YouTube channel listing unavailable; trying the three direct faculty-provided video links:", error.message);
  }
  const entries = (playlist.entries || []).filter(entry => VIDEO_ID.test(entry?.id));

  const inventory = JSON.parse(await readFile(DATA, "utf8"));
  const confirmed = JSON.parse(await readFile(CONFIRMED_LINKS, "utf8")).videos;
  const confirmedIds = new Set(confirmed.map(item => item.id));
  if (confirmedIds.size !== confirmed.length || confirmed.some(item => !VIDEO_ID.test(item.id))) {
    throw new Error("Invalid or duplicated department-confirmed YouTube IDs");
  }
  const old = new Map(inventory.map(video => [video.id, video]));
  const blocked = new Set(JSON.parse(await readFile(path.join(ROOT, "data/unavailable-videos.json"), "utf8")).map(x => x.id));
  let added = 0, revised = 0, unavailable = 0;

  // Existing 2026 uploads can be reclassified from their original YouTube
  // titles without fetching every video's metadata again.
  const knownInPlaylist = new Set();
  for (const entry of entries) {
    if (blocked.has(entry.id)) continue;
    const record = old.get(entry.id);
    if (!record || !record.uploadDate?.startsWith("2026")) continue;
    knownInPlaylist.add(entry.id);
    const newCategory = confirmedIds.has(entry.id) ?
      "graduate" : classification(entry.title, record.uploadDate, record.category);
    if (record.category !== newCategory) { record.category = newCategory; revised++; }
    if (entry.title && /졸업\s*작품|프로젝트/i.test(entry.title)) {
      const verifiedTitle = workTitle(entry.title);
      if (titleKey(verifiedTitle) !== titleKey(record.title)) {
        console.log(`Corrected stored work title for ${entry.id}: ${record.title} -> ${verifiedTitle}`);
        record.title = verifiedTitle; revised++;
      }
    }
    if (record.youtubeTitle !== entry.title) { record.youtubeTitle = entry.title; revised++; }
  }

  // The channel playlist supplies IDs and original titles. Metadata for new
  // entries supplies an actual upload date, duration and description; never
  // invent timestamps, links or student names.
  // The channel is newest-first. Stop at the first previously verified
  // pre-2026 upload so historical videos are not re-fetched unnecessarily.
  const previousYearIndex = entries.findIndex(entry =>
    old.has(entry.id) && (old.get(entry.id).uploadDate || "").slice(0, 4) < "2026");
  const relevantEntries = previousYearIndex < 0 ? entries : entries.slice(0, previousYearIndex);
  const candidates = relevantEntries
    .filter(entry => !old.has(entry.id) && !blocked.has(entry.id))
    .filter(entry => /졸업\s*작품|프로젝트/i.test(entry.title || ""));
  // Every department-supplied URL must be attempted even if the channel
  // listing omits it, truncates its title, or falls outside its first 90.
  for (const item of confirmed) {
    if (!old.has(item.id) && !blocked.has(item.id) &&
        !candidates.some(entry => entry.id === item.id)) {
      candidates.unshift({id:item.id, title:""});
    }
  }
  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) {
      const entry = candidates[cursor++];
      try {
        const detail = await youtube([
          "--dump-single-json", "--skip-download", "--no-playlist",
          `https://www.youtube.com/watch?v=${entry.id}`,
        ], 45000);
        const date = toDate(detail.upload_date || detail.release_date);
        const originalTitle = detail.title || entry.title;
        const isConfirmed = confirmedIds.has(entry.id);
        // Classification and identity are grounded in the original video.
        const label = isConfirmed ? "graduate" : classification(originalTitle, date);
        if (!date.startsWith("2026") || !label || !(Number(detail.duration) > 0) || !originalTitle) {
          console.warn(`Metadata incomplete for ${entry.id}; retaining exact YouTube fallback link.`);
          continue;
        }
        const video = {
          id: entry.id,
          title: workTitle(originalTitle),
          category: label,
          cohort: "",
          uploadDate: date,
          durationSeconds: Math.trunc(Number(detail.duration)),
          description: safeDescription(detail.description) ||
            `${workTitle(originalTitle)}의 2026년 소프트웨어 시연영상입니다. 한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과에서 개발한 결과물입니다.`,
          youtubeTitle: originalTitle,
        };
        if (!old.has(entry.id)) {
          // Same work with an incorrect old final-video ID: preserve the
          // initial upload separately as a project when it predates July.
          // Never overwrite a different work merely because its label is close.
          if (isConfirmed) {
            const matching = [...old.values()].filter(prev =>
              prev.category === "graduate" && prev.uploadDate?.startsWith("2026") &&
              titleKey(prev.title) === titleKey(video.title) && prev.id !== video.id);
            for (const prev of matching) {
              if (prev.uploadDate.slice(0,10) < "2026-07-01") {
                prev.category = "practice"; revised++;
                console.log(`Linked earlier project ${prev.id} to final work ${video.id}`);
              } else {
                console.warn(`Possible incorrect final-work link: ${prev.id} and ${video.id} both titled ${video.title}; manual review needed.`);
              }
            }
          }
          old.set(entry.id, video); added++;
        }
      } catch (error) {
        unavailable++;
        console.warn(`Could not validate new YouTube video ${entry.id}: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, candidates.length) }, worker));

  // Prior early-2026 videos had erroneously been treated as final works.
  // Pre-July practice demos remain in the archive, not in graduation counts.
  for (const video of old.values()) {
    if (video.uploadDate?.startsWith("2026") &&
        video.uploadDate.slice(0, 10) < JULY &&
        video.category === "graduate" &&
        !/졸업\s*작품/.test(video.youtubeTitle || "")) {
      video.category = "practice";
      revised++;
    }
  }
  const sorted = [...old.values()].sort((a,b) =>
    (b.uploadDate || "").localeCompare(a.uploadDate || "") ||
    (a.title || "").localeCompare(b.title || "", "ko-KR"));
  const finals = sorted.filter(v => v.category === "graduate" && v.uploadDate?.startsWith("2026"));
  if (added || revised) {
    await writeFile(DATA, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  }
  console.log(`YouTube sync: ${entries.length} channel entries checked; ${added} added, ${revised} reclassified, ${unavailable} unverified.`);
  console.log(`2026 graduation videos currently verified in inventory: ${finals.length}; expected ${EXPECTED_GRADUATION_WORKS} after all final uploads are discovered.`);
  if (finals.length !== EXPECTED_GRADUATION_WORKS) console.warn("Graduation-video count differs from the 16 reported by the department: review upstream titles/channel access.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
