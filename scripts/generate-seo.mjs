import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE_URL = "https://portfolio.k-bigdata.kr";
const DATA_PATH = path.join(ROOT, "data", "showcase-videos.json");
const todayParts = Object.fromEntries(
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
);
const TODAY = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
const REFRESH_YOUTUBE = process.argv.includes("--refresh-youtube");

const htmlEscape = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const xmlEscape = (value = "") => htmlEscape(value);
const jsonLd = (value) => JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
const categoryLabel = (category) => category === "graduate" ? "졸업작품" : "프로젝트실습";
const cohortLabel = (video) => video.cohort ? `${video.cohort} · ` : "";
const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id) => `${SITE_URL}/videos/${id}/`;
const embedUrl = (id) => `https://www.youtube.com/embed/${id}`;
const privacyEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;

function durationIso(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${secs || (!hours && !minutes) ? `${secs}S` : ""}`;
}

function durationText(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = String(value % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

function videoDescription(video) {
  const type = categoryLabel(video.category);
  const cohort = video.cohort ? `${video.cohort} 학생의 ` : "학생이 제작한 ";
  return `${video.title} 소프트웨어 시연영상입니다. 한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과 ${cohort}${type} 결과물의 기능과 구현 화면을 확인하세요.`;
}

function parseYoutubeMetadata(source) {
  const uploadDate = source.match(/itemprop="uploadDate" content="([^"]+)"/)?.[1]
    ?? source.match(/"uploadDate":"([^"]+)"/)?.[1];
  const durationSeconds = source.match(/"lengthSeconds":"(\d+)"/)?.[1];
  return {
    ...(uploadDate ? { uploadDate } : {}),
    ...(durationSeconds ? { durationSeconds: Number(durationSeconds) } : {}),
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function enrichYoutubeMetadata(videos) {
  let completed = 0;
  const enriched = await mapLimit(videos, 8, async (video) => {
    if (video.uploadDate && video.durationSeconds) {
      completed += 1;
      return video;
    }
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`, {
        headers: {
          "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
          "user-agent": "Mozilla/5.0 (compatible; KBigdataPortfolioMetadata/1.0)",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metadata = parseYoutubeMetadata(await response.text());
      completed += 1;
      if (completed % 25 === 0 || completed === videos.length) {
        process.stdout.write(`YouTube metadata ${completed}/${videos.length}\n`);
      }
      return { ...video, ...metadata };
    } catch (error) {
      completed += 1;
      process.stderr.write(`Metadata skipped for ${video.id}: ${error.message}\n`);
      return video;
    }
  });
  await writeFile(DATA_PATH, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  return enriched;
}

function cardMarkup(video) {
  const label = categoryLabel(video.category);
  const cohort = video.cohort ? `${video.cohort}` : "학생 작품";
  const searchText = `${video.title} ${video.cohort ?? ""}`.toLocaleLowerCase("ko-KR");
  return `          <article class="video-card" data-video-id="${htmlEscape(video.id)}" data-title="${htmlEscape(video.title)}" data-category="${htmlEscape(video.category)}" data-cohort="${htmlEscape(video.cohort ?? "")}" data-search="${htmlEscape(searchText)}">
            <a class="video-card-link" href="/videos/${encodeURIComponent(video.id)}/" aria-label="${htmlEscape(video.title)} 영상 페이지 보기">
              <div class="video-thumb"><img src="${thumbnailUrl(video.id)}" alt="${htmlEscape(video.title)} 영상 미리보기" loading="lazy" width="480" height="360" /></div>
              <div class="video-card-copy">
                <div class="video-card-meta"><span class="video-category">${label}</span><small>${htmlEscape(cohort)}</small></div>
                <h2>${htmlEscape(video.title)}</h2>
              </div>
            </a>
          </article>`;
}

function latestCardMarkup(video) {
  return `          <a class="latest-card" href="/videos/${encodeURIComponent(video.id)}/">
            <img src="${thumbnailUrl(video.id)}" alt="${htmlEscape(video.title)} 영상 미리보기" loading="lazy" width="480" height="360" />
            <div class="latest-card-copy"><small>${categoryLabel(video.category)}${video.cohort ? ` · ${htmlEscape(video.cohort)}` : ""}</small><h3>${htmlEscape(video.title)}</h3></div>
          </a>`;
}

function replaceGeneratedBlock(source, start, end, body) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing generated block markers: ${start} / ${end}`);
  }
  return `${source.slice(0, startIndex + start.length)}\n${body}\n${source.slice(endIndex)}`;
}

function uniqueTitleSuffixes(videos) {
  const totals = new Map();
  const seen = new Map();
  videos.forEach((video) => {
    const key = `${video.title}|${video.category}|${video.cohort ?? ""}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });
  return videos.map((video) => {
    const key = `${video.title}|${video.category}|${video.cohort ?? ""}`;
    const order = (seen.get(key) ?? 0) + 1;
    seen.set(key, order);
    return totals.get(key) > 1 ? ` · 시연 ${order}` : "";
  });
}

function videoPage(video, index, videos, titleSuffix) {
  const type = categoryLabel(video.category);
  const description = videoDescription(video);
  const canonical = watchUrl(video.id);
  const thumbnail = thumbnailUrl(video.id);
  const uploadDate = video.uploadDate;
  const duration = durationIso(video.durationSeconds);
  const displayDate = uploadDate ? uploadDate.slice(0, 10).replaceAll("-", ".") : "";
  const uniqueVideoTitle = `${video.title}${titleSuffix}`;
  const sameCategory = videos.filter((candidate) => candidate.category === video.category && candidate.id !== video.id);
  const relatedStart = sameCategory.length ? index % sameCategory.length : 0;
  const related = [...sameCategory.slice(relatedStart), ...sameCategory.slice(0, relatedStart)].slice(0, 3);
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: `${video.title} | ${cohortLabel(video)}${type} 시연영상`,
      description,
      inLanguage: "ko-KR",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      breadcrumb: { "@id": `${canonical}#breadcrumb` },
      ...(uploadDate ? { mainEntity: { "@id": `${canonical}#video` } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "학과 포트폴리오", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "시연영상", item: `${SITE_URL}/showcase/` },
        { "@type": "ListItem", position: 3, name: video.title, item: canonical },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "빅데이터소프트웨어공학과 포트폴리오",
      inLanguage: "ko-KR",
    },
  ];
  if (uploadDate) {
    graph.push({
      "@type": "VideoObject",
      "@id": `${canonical}#video`,
      name: uniqueVideoTitle,
      description,
      thumbnailUrl: [thumbnail],
      uploadDate,
      ...(duration ? { duration } : {}),
      embedUrl: embedUrl(video.id),
      url: canonical,
      inLanguage: "ko-KR",
      isFamilyFriendly: true,
      publisher: {
        "@type": "EducationalOrganization",
        name: "한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과",
        url: "https://ai.k-bigdata.kr/",
      },
    });
  }
  const relatedMarkup = related.map((item) => `
            <a class="video-related-card" href="/videos/${encodeURIComponent(item.id)}/">
              <img src="${thumbnailUrl(item.id)}" alt="${htmlEscape(item.title)} 영상 미리보기" loading="lazy" width="480" height="360" />
              <span><small>${categoryLabel(item.category)}${item.cohort ? ` · ${htmlEscape(item.cohort)}` : ""}</small><strong>${htmlEscape(item.title)}</strong></span>
            </a>`).join("");
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="description" content="${htmlEscape(description)}" />
    <meta name="theme-color" content="#101010" />
    <meta property="og:type" content="video.other" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="빅데이터소프트웨어공학과 포트폴리오" />
    <meta property="og:title" content="${htmlEscape(uniqueVideoTitle)} | ${htmlEscape(`${cohortLabel(video)}${type}`)} 시연영상" />
    <meta property="og:description" content="${htmlEscape(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${thumbnail}" />
    <meta property="og:image:width" content="480" />
    <meta property="og:image:height" content="360" />
    <meta property="og:video" content="${embedUrl(video.id)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${htmlEscape(uniqueVideoTitle)} | ${type} 시연영상" />
    <meta name="twitter:description" content="${htmlEscape(description)}" />
    <meta name="twitter:image" content="${thumbnail}" />
    <title>${htmlEscape(uniqueVideoTitle)} | ${htmlEscape(`${cohortLabel(video)}${type}`)} 시연영상 | 빅데이터소프트웨어공학과</title>
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-WN99333WLX"></script>
    <script defer src="/analytics.js"></script>
    <link rel="stylesheet" href="/hub.css" />
    <script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@graph": graph })}</script>
  </head>
  <body>
    <a class="skip-link" href="#video">영상으로 바로가기</a>
    <header class="hub-header">
      <a class="hub-brand" href="/" aria-label="학과 포트폴리오 홈"><span class="hub-brand-mark">AI</span><span><strong>빅데이터소프트웨어공학과</strong><small>한국폴리텍대학 서울강서캠퍼스</small></span></a>
      <nav class="hub-nav" aria-label="주요 메뉴"><a href="/">포트폴리오 홈</a><a href="/graduate/">졸업생 포트폴리오</a><a href="/showcase/" aria-current="page">시연영상</a></nav>
      <a class="hub-header-link" href="https://apply.jinhakapply.com/Notice/5041044/A" target="_blank" rel="noopener noreferrer">수시 1차 원서접수 ↗</a>
    </header>
    <main id="video" class="video-watch-main">
      <nav class="video-breadcrumb" aria-label="현재 위치"><a href="/">포트폴리오</a><span>›</span><a href="/showcase/">시연영상</a><span>›</span><span aria-current="page">${htmlEscape(video.title)}</span></nav>
      <section class="video-watch-hero">
        <div class="video-watch-copy">
          <p class="hub-kicker">${htmlEscape(`${cohortLabel(video)}${type}`.toUpperCase())}</p>
          <h1>${htmlEscape(video.title)}</h1>
          <p>${htmlEscape(description)}</p>
          <dl class="video-watch-meta">
            <div><dt>구분</dt><dd>${type}</dd></div>
            ${video.cohort ? `<div><dt>기수</dt><dd>${htmlEscape(video.cohort)}</dd></div>` : ""}
            ${displayDate ? `<div><dt>게시일</dt><dd><time datetime="${htmlEscape(uploadDate)}">${displayDate}</time></dd></div>` : ""}
            ${video.durationSeconds ? `<div><dt>재생시간</dt><dd>${durationText(video.durationSeconds)}</dd></div>` : ""}
          </dl>
        </div>
        <div class="video-watch-frame">
          <iframe src="${privacyEmbedUrl(video.id)}" title="${htmlEscape(video.title)} 시연영상" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="video-watch-actions"><a class="hub-button hub-button-primary" href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noopener">YouTube에서 보기 ↗</a><a class="hub-button hub-button-outline" href="/showcase/">전체 시연영상</a></div>
      </section>
      <section class="video-related" aria-labelledby="related-title"><div class="hub-section-head compact"><div><p class="hub-kicker">MORE STUDENT WORK</p><h2 id="related-title">같은 분류의<br />다른 작품</h2></div></div><div class="video-related-grid">${relatedMarkup}</div></section>
      <section class="hub-cta"><p class="hub-kicker">FROM LEARNING TO BUILDING</p><h2>다음 작품의<br />주인공이 되어 보세요.</h2><p>AI·데이터·클라우드를 배우고 실제로 작동하는 소프트웨어로 완성합니다.</p><div class="hub-actions centered"><a class="hub-button hub-button-dark" href="https://ai.k-bigdata.kr/">학과 알아보기 ↗</a><a class="hub-button hub-button-outline" href="https://apply.jinhakapply.com/Notice/5041044/A" target="_blank" rel="noopener noreferrer">수시 1차 원서접수 ↗</a></div></section>
    </main>
    <footer class="hub-footer"><a class="hub-brand" href="/"><span class="hub-brand-mark">AI</span><span><strong>빅데이터소프트웨어공학과</strong><small>한국폴리텍대학 서울강서캠퍼스</small></span></a><nav aria-label="연계 사이트"><a href="/showcase/">전체 시연영상</a><a href="/graduate/">졸업생 포트폴리오</a><a href="https://ai.k-bigdata.kr/">학과 홈페이지</a><a href="https://prof.k-bigdata.kr/">교수 기술 블로그</a></nav><p>© 2026 Korea Polytechnics Seoul Gangseo Campus</p></footer>
  </body>
</html>
`;
}

function sitemapXml(videos) {
  const core = [
    [`${SITE_URL}/`, "1.0"],
    [`${SITE_URL}/graduate/`, "0.9"],
    [`${SITE_URL}/showcase/`, "0.9"],
  ];
  const urls = [
    ...core.map(([url, priority]) => `  <url><loc>${url}</loc><lastmod>${TODAY}</lastmod><priority>${priority}</priority></url>`),
    ...videos.map((video) => `  <url><loc>${watchUrl(video.id)}</loc><lastmod>${TODAY}</lastmod><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function videoSitemapXml(videos) {
  const urls = videos.map((video) => {
    const description = videoDescription(video);
    return `  <url>
    <loc>${watchUrl(video.id)}</loc>
    <video:video>
      <video:thumbnail_loc>${thumbnailUrl(video.id)}</video:thumbnail_loc>
      <video:title>${xmlEscape(video.title)}</video:title>
      <video:description>${xmlEscape(description)}</video:description>
      <video:player_loc allow_embed="yes">${embedUrl(video.id)}</video:player_loc>
      ${video.uploadDate ? `<video:publication_date>${xmlEscape(video.uploadDate)}</video:publication_date>\n      ` : ""}<video:family_friendly>yes</video:family_friendly>
      <video:uploader info="https://ai.k-bigdata.kr/">한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과</video:uploader>
    </video:video>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}

async function main() {
  let videos = JSON.parse(await readFile(DATA_PATH, "utf8"));
  if (!Array.isArray(videos) || videos.length === 0) throw new Error("No showcase videos found");
  videos.forEach((video) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.id)) throw new Error(`Invalid YouTube ID: ${video.id}`);
    if (!video.title || !["graduate", "practice"].includes(video.category)) throw new Error(`Invalid video record: ${video.id}`);
  });
  if (REFRESH_YOUTUBE) videos = await enrichYoutubeMetadata(videos);

  const showcasePath = path.join(ROOT, "showcase", "index.html");
  const showcase = replaceGeneratedBlock(
    await readFile(showcasePath, "utf8"),
    "<!-- SEO_VIDEO_CARDS_START -->",
    "<!-- SEO_VIDEO_CARDS_END -->",
    videos.map(cardMarkup).join("\n"),
  );
  await writeFile(showcasePath, showcase, "utf8");

  const homePath = path.join(ROOT, "index.html");
  const home = replaceGeneratedBlock(
    await readFile(homePath, "utf8"),
    "<!-- SEO_LATEST_VIDEOS_START -->",
    "<!-- SEO_LATEST_VIDEOS_END -->",
    videos.slice(0, 3).map(latestCardMarkup).join("\n"),
  );
  await writeFile(homePath, home, "utf8");

  const titleSuffixes = uniqueTitleSuffixes(videos);
  await mapLimit(videos, 16, async (video, index) => {
    const directory = path.join(ROOT, "videos", video.id);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), videoPage(video, index, videos, titleSuffixes[index]), "utf8");
  });

  await writeFile(path.join(ROOT, "sitemap.xml"), sitemapXml(videos), "utf8");
  await writeFile(path.join(ROOT, "video-sitemap.xml"), videoSitemapXml(videos), "utf8");
  process.stdout.write(`Generated ${videos.length} watch pages and two sitemaps.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
