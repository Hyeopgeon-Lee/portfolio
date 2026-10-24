import assert from "node:assert/strict";
import { parseYoutubeFeed } from "../scripts/youtube-feed.mjs";

const sample = '<?xml version="1.0"?><feed><entry><yt:videoId>nZcWGA2R8uw</yt:videoId><title>2026 졸업작품 - K &amp; L</title><published>2026-10-24T13:27:42+00:00</published><media:group><media:description>작품 설명 &amp; 적용 기술</media:description></media:group></entry><entry><yt:videoId>invalid</yt:videoId><title>Bad</title><published>2026-10-24T13:27:42Z</published></entry></feed>';
const found = parseYoutubeFeed(sample);
assert.equal(found.size, 1);
assert.equal(found.get("nZcWGA2R8uw").title, "2026 졸업작품 - K & L");
assert.equal(found.get("nZcWGA2R8uw").description, "작품 설명 & 적용 기술");
assert.equal(found.get("nZcWGA2R8uw").published, "2026-10-24T13:27:42+00:00");
assert.equal(parseYoutubeFeed('<entry><yt:videoId>nZcWGA2R8uw</yt:videoId><title>test</title><published>INVALID</published></entry>').size, 0);
console.log("Official YouTube feed parser tests passed.");
