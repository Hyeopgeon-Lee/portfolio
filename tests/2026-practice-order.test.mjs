import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = async filename => readFile(new URL("../" + filename, import.meta.url), "utf8");
const config = JSON.parse(await read("data/2026-practice-display-order.json"));
const videos = JSON.parse(await read("data/showcase-videos.json"));
const priority = config.videoIds;

assert.equal(priority.length, 5, "Five available priority practice recordings are required");
assert.equal(new Set(priority).size, priority.length, "Practice video priority IDs must be unique");
for (const id of priority) {
  const video = videos.find(v => v.id === id);
  assert.ok(video && video.category === "practice" && video.uploadDate?.startsWith("2026"),
    "Priority video must exist as a 2026 initial project: " + id);
}

const archive = await read("showcase/index.html");
const cards = [...archive.matchAll(/<article class="video-card" data-video-id="([A-Za-z0-9_-]{11})" data-year="([^"]+)" data-title="[^"]*" data-category="([^"]+)"/g)]
  .map(match => ({id:match[1],year:match[2],category:match[3]}));
const practice = cards.filter(card => card.year === "2026" && card.category === "practice").map(card => card.id);
assert.equal(practice.length, 16, "All 16 original 2026 practice recordings must remain visible");
assert.equal(new Set(practice).size, practice.length, "No practice video may appear twice");
assert.deepEqual(practice.slice(0, priority.length), priority, "2026 practice display order mismatch");

const home = await read("index.html");
const block = home.split("<!-- SEO_2026_PRACTICE_START -->")[1]?.split("<!-- SEO_2026_PRACTICE_END -->")[0] || "";
const homeCards = [...block.matchAll(/href="\/videos\/([A-Za-z0-9_-]{11})\/"/g)].map(match => match[1]);
assert.deepEqual(homeCards, practice.slice(0, 6), "Homepage 2026 practice cards must match the archive order");

// Each practice entry opens its own early-stage video; links to final graduation
// works are secondary cross-references, never substitutes for the practice video.
for (const id of priority) {
  const entry = archive.match(new RegExp('<article class="video-card" data-video-id="' + id + '"[\\s\\S]*?<\\/article>'))?.[0] || "";
  assert.ok(entry.includes('href="/videos/' + id + '/"'), "Practice detail link must use initial video " + id);
  assert.ok(entry.includes('href="https://www.youtube.com/watch?v=' + id + '"'), "Practice YouTube URL mismatch " + id);
  const detail = await read("videos/" + id + "/index.html");
  assert.ok(detail.includes('https://www.youtube.com/watch?v=' + id), "Practice detail page YouTube URL mismatch " + id);
}
const twins = [
  ["7KiS8G5HjGc", "shpXXmx3gGc"],
  ["Z2vySIjLLiE", "3D8PdVOwZRY"],
  ["CPBuZ8p2TkY", "LDGahzQRM88"],
  ["6VEgogT6Qo4", "IpLoGlue3fQ"],
  ["AFCBvC8UhaE", "O13tC34ezqw"],
];
for(const [early, final] of twins) {
  const entry = archive.match(new RegExp('<article class="video-card" data-video-id="' + early + '"[\\s\\S]*?<\\/article>'))?.[0] || "";
  assert.ok(entry.includes('href="/videos/' + final + '/"'), "Graduation twin link missing for " + early);
}
console.log("2026 practice order and early/final video links verified in archive and homepage.");
