// Parse the official public YouTube channel Atom feed. No API key is required.
// Feed entries are recent-only; older videos remain sourced from verified inventory.
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const decode = value => String(value ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (all, code) => {
    const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return Number.isInteger(point) && point >= 32 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  })
  .replace(/&(amp|lt|gt|quot|apos);/g, (all, name) => ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'"})[name]);
const tag = (xml, name) => decode(xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i"))?.[1] || "");
export function parseYoutubeFeed(xml) {
  const entries = new Map();
  for (const match of String(xml || "").matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
    const body = match[1];
    const id = tag(body, "yt:videoId");
    const published = tag(body, "published");
    const title = tag(body, "title").trim();
    if (!VIDEO_ID.test(id) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(published) || !Number.isFinite(Date.parse(published)) || !title) continue;
    entries.set(id, {id, published, title, description:tag(body, "media:description").trim()});
  }
  return entries;
}
export async function readYoutubeChannelFeed(channelId) {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(String(channelId || ""))) return new Map();
  const url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(15000),headers:{"user-agent":"Mozilla/5.0","accept":"application/atom+xml,application/xml,text/xml"}});
    if (!response.ok) throw new Error("HTTP " + response.status);
    const entries = parseYoutubeFeed(await response.text());
    console.log("YouTube official feed: " + entries.size + " recent entries obtained");
    return entries;
  } catch (error) {
    console.warn("YouTube official feed unavailable: " + error.message);
    return new Map();
  }
}
