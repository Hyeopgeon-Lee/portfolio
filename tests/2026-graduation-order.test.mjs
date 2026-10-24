import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = async filename => readFile(new URL("../" + filename, import.meta.url), "utf8");
const config = JSON.parse(await read("data/2026-graduation-display-order.json"));
const videos = JSON.parse(await read("data/showcase-videos.json"));
const pinned = config.videoIds;
assert.equal(pinned.length, 7, "Exactly the seven requested priority videos are required");
assert.equal(new Set(pinned).size, pinned.length, "Priority IDs must be unique");
for (const id of pinned) {
  const video = videos.find(v => v.id === id);
  assert.ok(video && video.category === "graduate" && video.uploadDate?.startsWith("2026"),
    "Priority video must exist as a 2026 graduation work: " + id);
}
const archive = await read("showcase/index.html");
const cards = [...archive.matchAll(/<article class="video-card" data-video-id="([A-Za-z0-9_-]{11})" data-year="([^"]+)" data-title="[^"]*" data-category="([^"]+)"/g)]
  .map(match => ({id:match[1],year:match[2],category:match[3]}));
const graduation = cards.filter(card => card.year === "2026" && card.category === "graduate").map(card => card.id);
assert.equal(graduation.length, 16, "All 16 graduation cards must be present");
assert.deepEqual(graduation.slice(0, pinned.length), pinned, "2026 graduation archive display order mismatch");
assert.equal(new Set(graduation).size, graduation.length, "No video may appear twice");

const home = await read("index.html");
const block = home.split("<!-- SEO_2026_VIDEOS_START -->")[1]?.split("<!-- SEO_2026_VIDEOS_END -->")[0] || "";
const homeCards = [...block.matchAll(/href="\/videos\/([A-Za-z0-9_-]{11})\/"/g)].map(match => match[1]);
assert.deepEqual(homeCards, pinned, "Homepage first seven 2026 graduation works must match the priority order");
console.log("2026 graduation work presentation order passed in both homepage and archive.");
