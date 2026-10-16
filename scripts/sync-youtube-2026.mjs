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

async function youtube(args, timeout = 180000) {
  const { stdout } = await run("yt-dlp", [
    "--no-warnings", "--ignore-errors",
    ...args,
  ], { maxBuffer: 28 * 1024 * 1024, timeout });
  return JSON.parse(stdout);
}
function toDate(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "").slice(0, 8);
  return digits.length === 8
    ? `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}T00:00:00+09:00`
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
  const cleaned = String(source || "")
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
  let playlist;
  try {
    playlist = await youtube(["--flat-playlist", "--dump-single-json", "--playlist-end", "90", CHANNEL]);
  } catch (error) {
    console.warn("YouTube channel is temporarily inaccessible; existing verified archive is preserved:", error.message);
    return;
  }
  const entries = (playlist.entries || []).filter(entry => VIDEO_ID.test(entry?.id));
  if (!entries.length) {
    console.warn("No YouTube entries were returned; no changes made.");
    return;
  }

  const inventory = JSON.parse(await readFile(DATA, "utf8"));
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
    const newCategory = classification(entry.title, record.uploadDate, record.category);
    if (record.category !== newCategory) { record.category = newCategory; revised++; }
    record.youtubeTitle = entry.title;
  }

  // The channel playlist supplies IDs and original titles. Metadata for new
  // entries supplies an actual upload date, duration and description; never
  // invent timestamps, links or student names.
  const candidates = entries
    .filter(entry => !old.has(entry.id) && !blocked.has(entry.id))
    .filter(entry => /졸업\s*작품|프로젝트/i.test(entry.title || ""));
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
        const label = classification(entry.title || detail.title, date);
        if (!date.startsWith("2026") || !label || !(Number(detail.duration) > 0)) continue;
        const originalTitle = entry.title || detail.title;
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
        if (!old.has(entry.id)) { old.set(entry.id, video); added++; }
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
  console.log(`2026 graduation videos currently verified in inventory: ${finals.length}; expected 16 after all final uploads are discovered.`);
  if (finals.length !== 16) console.warn("Graduation-video count differs from the 16 reported by the department: review upstream titles/channel access.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
