import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

function metaContent(html, key, attribute = "name") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta ${attribute}="${escaped}" content="([^"]*)"`))?.[1] ?? "";
}

function canonical(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
}

function title(html) {
  return html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
}

function jsonLdBlocks(html, file) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match, index) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${file}: JSON-LD ${index + 1} is invalid (${error.message})`);
      return null;
    }
  }).filter(Boolean);
}

async function main() {
  const videos = JSON.parse(await readFile(path.join(ROOT, "data", "showcase-videos.json"), "utf8"));
  assert(videos.length === 255, `Expected 255 videos, found ${videos.length}`);
  assert(new Set(videos.map((video) => video.id)).size === videos.length, "YouTube IDs must be unique");
  assert(videos.every((video) => video.uploadDate), "Every video needs an uploadDate");
  assert(videos.every((video) => video.durationSeconds > 0), "Every video needs a durationSeconds value");

  const coreFiles = ["index.html", "graduate/index.html", "showcase/index.html"];
  for (const file of coreFiles) {
    const html = await readFile(path.join(ROOT, file), "utf8");
    assert(title(html), `${file}: missing title`);
    assert(metaContent(html, "description"), `${file}: missing meta description`);
    assert(canonical(html), `${file}: missing canonical`);
    assert(metaContent(html, "og:image", "property"), `${file}: missing og:image`);
    assert(metaContent(html, "twitter:card"), `${file}: missing twitter card`);
    assert(jsonLdBlocks(html, file).length > 0, `${file}: missing JSON-LD`);
  }

  const graduate = await readFile(path.join(ROOT, "graduate", "index.html"), "utf8");
  assert((graduate.match(/class="project-card"/g) ?? []).length === 8, "Graduate page must contain 8 static project cards");
  const profileGraph = jsonLdBlocks(graduate, "graduate/index.html")[0];
  assert(profileGraph?.mainEntity?.["@type"] === "Person", "ProfilePage requires a Person mainEntity");

  const showcase = await readFile(path.join(ROOT, "showcase", "index.html"), "utf8");
  assert((showcase.match(/class="video-card"/g) ?? []).length === videos.length, "Showcase must contain one static card per video");
  assert((showcase.match(/href="\/videos\/[A-Za-z0-9_-]{11}\//g) ?? []).length === videos.length, "Showcase video cards need crawlable links");

  const videoDirectories = (await readdir(path.join(ROOT, "videos"), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert(videoDirectories.length === videos.length, `Expected ${videos.length} video directories, found ${videoDirectories.length}`);
  const titles = [];
  const canonicals = [];
  for (const video of videos) {
    const file = `videos/${video.id}/index.html`;
    const html = await readFile(path.join(ROOT, file), "utf8");
    titles.push(title(html));
    canonicals.push(canonical(html));
    assert(metaContent(html, "description"), `${file}: missing description`);
    assert(metaContent(html, "og:image", "property"), `${file}: missing og:image`);
    assert(html.includes(`<iframe src="https://www.youtube-nocookie.com/embed/${video.id}`), `${file}: missing visible video iframe`);
    const data = jsonLdBlocks(html, file)[0];
    const graph = data?.["@graph"] ?? [];
    const videoObject = graph.find((item) => item["@type"] === "VideoObject");
    assert(videoObject?.name, `${file}: missing VideoObject name`);
    assert(videoObject?.thumbnailUrl?.length, `${file}: missing VideoObject thumbnailUrl`);
    assert(videoObject?.uploadDate, `${file}: missing VideoObject uploadDate`);
    assert(videoObject?.embedUrl, `${file}: missing VideoObject embedUrl`);
  }
  assert(new Set(titles).size === titles.length, "Generated page titles must be unique");
  assert(new Set(canonicals).size === canonicals.length, "Generated canonicals must be unique");

  const sitemap = await readFile(path.join(ROOT, "sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(sitemapUrls.length === videos.length + 3, `Main sitemap must contain ${videos.length + 3} URLs`);
  assert(new Set(sitemapUrls).size === sitemapUrls.length, "Main sitemap URLs must be unique");

  const videoSitemap = await readFile(path.join(ROOT, "video-sitemap.xml"), "utf8");
  assert((videoSitemap.match(/<video:video>/g) ?? []).length === videos.length, "Video sitemap count mismatch");
  assert((videoSitemap.match(/<video:publication_date>/g) ?? []).length === videos.length, "Video sitemap publication dates are incomplete");

  if (errors.length) {
    process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`SEO check passed: ${coreFiles.length} core pages, ${videos.length} watch pages, ${sitemapUrls.length} sitemap URLs.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
