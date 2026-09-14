import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE_URL = "https://portfolio.k-bigdata.kr";
const DATA_PATH = path.join(ROOT, "data", "showcase-videos.json");
const PROJECTS_PATH = path.join(ROOT, "data", "graduate-projects.json");
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

function fallbackVideoDescription(video) {
  const type = categoryLabel(video.category);
  const cohort = video.cohort ? `${video.cohort} 학생의 ` : "학생이 제작한 ";
  return `${video.title} 소프트웨어 시연영상입니다. 한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과 ${cohort}${type} 결과물의 기능과 구현 화면을 확인하세요.`;
}

function truncate(value, maxLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim()}…`;
}

function cleanYoutubeDescription(value = "") {
  const hiddenLine = /^(?:[-–—*•●▸]\s*)?(?:[❍○◦]\s*)?(?:개발자|제작자|작성자|성명|이름|연락처|전화|휴대전화|이메일|e-mail|github(?:\s*주소)?|깃허브(?:\s*주소)?|블로그(?:\s*주소)?|도메인\s*주소|홈페이지\s*주소)\s*[:：]/i;
  const titleLine = /^(?:[-–—*•●▸]\s*)?(?:[❍○◦]\s*)?(?:제\s*목|title)\s*[:：]/i;
  const lines = String(value)
    .replaceAll("\r", "")
    .replaceAll("\u00a0", " ")
    .replaceAll("\u200b", "")
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      if (/^(?:[❍○◦]\s*)?설명\s*[:：]?$/i.test(line)) return "작품 설명";
      if (/^(?:[❍○◦]\s*)?적용\s*기술\s*[:：]?$/i.test(line)) return "적용 기술";
      return line.replace(/^[❍○◦]\s*/, "");
    })
    .filter((line) => !hiddenLine.test(line) && !titleLine.test(line))
    .filter((line) => !/^(?:https?:\/\/|www\.)\S+$/i.test(line))
    .map((line) => line.replace(/https?:\/\/\S+/gi, "").trim())
    .filter((line) => !/^(?:[#＃][^\s]+\s*)+$/.test(line));

  const compact = [];
  for (const line of lines) {
    if (!line && (!compact.length || compact.at(-1) === "")) continue;
    compact.push(line);
  }
  return compact.join("\n").trim().slice(0, 6000);
}

function videoDescription(video) {
  if (!video.description || video.description.length < 80) return fallbackVideoDescription(video);
  const paragraphs = video.description
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter((part) => part && !["작품 설명", "적용 기술"].includes(part));
  const lead = paragraphs.find((part) => part.length >= 35) ?? paragraphs[0];
  return truncate(`${lead} 한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과 학생 작품입니다.`, 260);
}

function uniqueVideoDescription(video, titleSuffix = "", maxLength = 300) {
  const published = video.uploadDate ? ` · ${video.uploadDate.slice(0, 10)}` : "";
  const label = `${video.title}${titleSuffix} · ${cohortLabel(video)}${categoryLabel(video.category)} 시연영상${published}`;
  return truncate(`${label}. ${videoDescription(video)}`, maxLength);
}

function videoDetailsMarkup(video) {
  if (!video.description || video.description.length < 80) return "";
  return video.description.split(/\n{2,}/).map((part) => {
    const text = part.trim();
    if (!text) return "";
    if (["작품 설명", "적용 기술"].includes(text)) return `<h2>${htmlEscape(text)}</h2>`;
    return `<p>${htmlEscape(text).replaceAll("\n", "<br />")}</p>`;
  }).join("\n");
}

function parseYoutubeMetadata(source) {
  const uploadDate = source.match(/itemprop="uploadDate" content="([^"]+)"/)?.[1]
    ?? source.match(/"uploadDate":"([^"]+)"/)?.[1];
  const durationSeconds = source.match(/"lengthSeconds":"(\d+)"/)?.[1];
  const encodedDescription = source.match(/"shortDescription":"((?:\\.|[^"\\])*)"/)?.[1];
  let description = "";
  if (encodedDescription) {
    try {
      description = cleanYoutubeDescription(JSON.parse(`"${encodedDescription}"`));
    } catch {
      description = "";
    }
  }
  return {
    ...(uploadDate ? { uploadDate } : {}),
    ...(durationSeconds ? { durationSeconds: Number(durationSeconds) } : {}),
    ...(description ? { description } : {}),
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
  const enriched = await mapLimit(videos, 4, async (video) => {
    const existingDescription = cleanYoutubeDescription(video.description);
    if (video.uploadDate && video.durationSeconds && existingDescription) {
      completed += 1;
      return { ...video, description: existingDescription };
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
  const searchText = `${video.title} ${video.cohort ?? ""} ${truncate(video.description, 500)}`.toLocaleLowerCase("ko-KR");
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
  const canonical = watchUrl(video.id);
  const thumbnail = thumbnailUrl(video.id);
  const uploadDate = video.uploadDate;
  const duration = durationIso(video.durationSeconds);
  const displayDate = uploadDate ? uploadDate.slice(0, 10).replaceAll("-", ".") : "";
  const uniqueVideoTitle = `${video.title}${titleSuffix}`;
  const description = uniqueVideoDescription(video, titleSuffix);
  const details = videoDetailsMarkup(video);
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
${details ? `      <section class="video-details" aria-labelledby="video-details-title"><div class="video-details-heading"><p class="hub-kicker">PROJECT NOTES</p><h2 id="video-details-title">작품을 더 자세히<br />살펴보세요.</h2></div><div class="video-details-copy">${details}</div></section>\n` : ""}      <section class="video-related" aria-labelledby="related-title"><div class="hub-section-head compact"><div><p class="hub-kicker">MORE STUDENT WORK</p><h2 id="related-title">같은 분류의<br />다른 작품</h2></div></div><div class="video-related-grid">${relatedMarkup}</div></section>
      <section class="hub-cta"><p class="hub-kicker">FROM LEARNING TO BUILDING</p><h2>다음 작품의<br />주인공이 되어 보세요.</h2><p>AI·데이터·클라우드를 배우고 실제로 작동하는 소프트웨어로 완성합니다.</p><div class="hub-actions centered"><a class="hub-button hub-button-dark" href="https://ai.k-bigdata.kr/">학과 알아보기 ↗</a><a class="hub-button hub-button-outline" href="https://apply.jinhakapply.com/Notice/5041044/A" target="_blank" rel="noopener noreferrer">수시 1차 원서접수 ↗</a></div></section>
    </main>
    <footer class="hub-footer"><a class="hub-brand" href="/"><span class="hub-brand-mark">AI</span><span><strong>빅데이터소프트웨어공학과</strong><small>한국폴리텍대학 서울강서캠퍼스</small></span></a><nav aria-label="연계 사이트"><a href="/showcase/">전체 시연영상</a><a href="/graduate/">졸업생 포트폴리오</a><a href="https://ai.k-bigdata.kr/">학과 홈페이지</a><a href="https://prof.k-bigdata.kr/">교수 기술 블로그</a></nav><p>© 2026 Korea Polytechnics Seoul Gangseo Campus</p></footer>
  </body>
</html>
`;
}

function projectUrl(project) {
  return `${SITE_URL}/projects/${project.slug}/`;
}

function projectCardMarkup(project) {
  return `          <article class="project-card" data-categories="${htmlEscape(project.categories.join(" "))}"><a class="project-card-button" href="/projects/${encodeURIComponent(project.slug)}/" aria-label="${htmlEscape(project.title)} 상세 페이지 보기"><div class="project-image"><img src="${htmlEscape(project.images[0])}" alt="${htmlEscape(project.title)} 프로젝트 소개 화면" loading="lazy" /></div><div class="project-copy"><div class="project-meta"><span>${htmlEscape(project.id)} / ${htmlEscape(project.categoryLabel)}</span><span class="project-award">${htmlEscape(project.award)}</span></div><h3>${htmlEscape(project.title)}</h3><p>${htmlEscape(project.short)}</p><div class="project-bottom"><div class="project-tags">${project.stack.slice(0, 4).map((item) => `<span>${htmlEscape(item)}</span>`).join("")}</div><span class="project-arrow" aria-hidden="true">↗</span></div></div></a></article>`;
}

function projectPage(project, index, projects) {
  const canonical = projectUrl(project);
  const previewImage = `${SITE_URL}${project.images[0]}`;
  const nextProject = projects[(index + 1) % projects.length];
  const description = `${project.title}: ${project.summary} 주요 기술은 ${project.stack.slice(0, 5).join(", ")}입니다.`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: `${project.title} | 졸업생 프로젝트`,
        description,
        inLanguage: "ko-KR",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        mainEntity: { "@id": `${canonical}#project` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "학과 포트폴리오", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "졸업생 포트폴리오", item: `${SITE_URL}/graduate/` },
          { "@type": "ListItem", position: 3, name: project.title, item: canonical },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${canonical}#project`,
        name: project.title,
        description: project.summary,
        applicationCategory: project.categoryLabel,
        image: project.images.map((image) => `${SITE_URL}${image}`),
        award: project.award,
        creator: {
          "@type": "Person",
          name: "우리학과 졸업생 허ㅇ혜",
          alumniOf: {
            "@type": "EducationalOrganization",
            name: "한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과",
            url: "https://ai.k-bigdata.kr/",
          },
        },
        keywords: project.stack,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "빅데이터소프트웨어공학과 포트폴리오",
        inLanguage: "ko-KR",
      },
    ],
  };

  const highlights = project.highlights.map((item) => `<li>${htmlEscape(item)}</li>`).join("");
  const stack = project.stack.map((item) => `<span>${htmlEscape(item)}</span>`).join("");
  const gallery = project.images.map((image, imageIndex) => `<figure><img src="${htmlEscape(image)}" alt="${htmlEscape(`${project.title} ${project.captions[imageIndex]}`)}" loading="${imageIndex === 0 ? "eager" : "lazy"}" /><figcaption>${htmlEscape(project.captions[imageIndex])}</figcaption></figure>`).join("");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="description" content="${htmlEscape(description)}" />
    <meta name="theme-color" content="#101010" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="빅데이터소프트웨어공학과 포트폴리오" />
    <meta property="og:title" content="${htmlEscape(project.title)} | 졸업생 프로젝트" />
    <meta property="og:description" content="${htmlEscape(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${previewImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${htmlEscape(project.title)} | 졸업생 프로젝트" />
    <meta name="twitter:description" content="${htmlEscape(description)}" />
    <meta name="twitter:image" content="${previewImage}" />
    <title>${htmlEscape(project.title)} | 졸업생 프로젝트 | 빅데이터소프트웨어공학과</title>
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-WN99333WLX"></script>
    <script defer src="/analytics.js"></script>
    <link rel="stylesheet" href="/styles.css" />
    <script type="application/ld+json">${jsonLd(graph)}</script>
  </head>
  <body>
    <a class="skip-link" href="#project">프로젝트 내용으로 바로가기</a>
    <header class="site-header">
      <a class="brand" href="/" aria-label="학과 포트폴리오 홈"><span class="brand-mark">AI</span><span class="brand-text">빅데이터소프트웨어공학과<br />서울강서캠퍼스</span></a>
      <nav aria-label="주요 메뉴"><a href="/">포트폴리오 홈</a><a href="/graduate/" aria-current="page">졸업생 포트폴리오</a><a href="/showcase/">시연영상</a></nav>
      <a class="header-link" href="https://apply.jinhakapply.com/Notice/5041044/A" target="_blank" rel="noopener noreferrer">수시 1차 원서접수 <span aria-hidden="true">↗</span></a>
    </header>
    <main id="project" class="project-detail-main">
      <nav class="project-breadcrumb" aria-label="현재 위치"><a href="/">포트폴리오</a><span>›</span><a href="/graduate/">졸업생 포트폴리오</a><span>›</span><span aria-current="page">${htmlEscape(project.title)}</span></nav>
      <section class="project-detail-hero">
        <p class="eyebrow">PROJECT ${htmlEscape(project.id)} · ${htmlEscape(project.categoryLabel)}</p>
        <h1>${htmlEscape(project.title)}</h1>
        <p class="project-detail-summary">${htmlEscape(project.summary)}</p>
        <div class="project-detail-info"><div><span>PERIOD</span><strong>${htmlEscape(project.period)}</strong></div><div><span>ROLE</span><strong>${htmlEscape(project.role)}</strong></div><div><span>RESULT</span><strong>${htmlEscape(project.award)}</strong></div></div>
      </section>
      <section class="project-detail-content" aria-labelledby="contribution-title">
        <div><p class="section-index">01 / CONTRIBUTION</p><h2 id="contribution-title">문제를 기술로<br />해결한 과정</h2></div>
        <div><p class="project-detail-lead">${htmlEscape(project.short)}</p><ul class="project-detail-highlights">${highlights}</ul><div class="project-detail-stack" aria-label="사용 기술">${stack}</div></div>
      </section>
      <section class="project-detail-gallery" aria-labelledby="gallery-title"><div class="project-detail-gallery-head"><p class="section-index">02 / PROJECT VIEW</p><h2 id="gallery-title">구현 화면과<br />서비스 구조</h2></div><div class="project-detail-gallery-grid">${gallery}</div></section>
      <section class="project-detail-next"><div><p class="section-index">NEXT PROJECT</p><h2>${htmlEscape(nextProject.title)}</h2></div><a class="button button-primary" href="/projects/${encodeURIComponent(nextProject.slug)}/">다음 프로젝트 보기 ↗</a></section>
      <section class="cta section" aria-labelledby="project-cta-title"><p class="section-index">FROM LEARNING TO BUILDING</p><h2 id="project-cta-title">이런 프로젝트를<br />직접 만들고 싶다면?</h2><p>한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과에서 AI·데이터·클라우드를 프로젝트로 배우세요.</p><div class="hero-actions"><a class="button button-dark" href="https://ai.k-bigdata.kr/">학과 알아보기 ↗</a><a class="button button-ghost" href="https://apply.jinhakapply.com/Notice/5041044/A" target="_blank" rel="noopener noreferrer">수시 1차 원서접수 ↗</a></div></section>
    </main>
    <footer><a class="brand" href="/"><span class="brand-mark">AI</span><span class="brand-text">빅데이터소프트웨어공학과<br />서울강서캠퍼스</span></a><div class="footer-info"><p>우리학과 졸업생 허ㅇ혜의 공개 포트폴리오입니다.</p><nav class="footer-network" aria-label="연계 사이트"><a href="/graduate/">졸업생 포트폴리오</a><a href="/showcase/">전체 시연영상</a><a href="https://ai.k-bigdata.kr/">학과 홈페이지</a><a href="https://prof.k-bigdata.kr/">교수 기술 블로그</a></nav></div><p>© 2026 Korea Polytechnics Seoul Gangseo Campus</p></footer>
  </body>
</html>
`;
}

function sitemapXml(videos, projects) {
  const core = [
    [`${SITE_URL}/`, "1.0"],
    [`${SITE_URL}/graduate/`, "0.9"],
    [`${SITE_URL}/showcase/`, "0.9"],
  ];
  const urls = [
    ...core.map(([url, priority]) => `  <url><loc>${url}</loc><lastmod>${TODAY}</lastmod><priority>${priority}</priority></url>`),
    ...projects.map((project) => `  <url><loc>${projectUrl(project)}</loc><lastmod>${TODAY}</lastmod><priority>0.8</priority></url>`),
    ...videos.map((video) => `  <url><loc>${watchUrl(video.id)}</loc><lastmod>${TODAY}</lastmod><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function videoSitemapXml(videos, titleSuffixes) {
  const urls = videos.map((video, index) => {
    const label = `${video.title}${titleSuffixes[index]} · ${cohortLabel(video)}${categoryLabel(video.category)} 시연영상`;
    const description = truncate(`${label}. ${video.description || videoDescription(video)}`, 1900);
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
  const projects = JSON.parse(await readFile(PROJECTS_PATH, "utf8"));
  if (!Array.isArray(videos) || videos.length === 0) throw new Error("No showcase videos found");
  if (!Array.isArray(projects) || projects.length === 0) throw new Error("No graduate projects found");
  videos.forEach((video) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.id)) throw new Error(`Invalid YouTube ID: ${video.id}`);
    if (!video.title || !["graduate", "practice"].includes(video.category)) throw new Error(`Invalid video record: ${video.id}`);
  });
  projects.forEach((project) => {
    if (!/^\d{2}$/.test(project.id) || !/^[a-z0-9-]+$/.test(project.slug)) throw new Error(`Invalid project record: ${project.id}`);
    if (!project.title || !project.summary || !project.images?.length) throw new Error(`Incomplete project record: ${project.id}`);
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

  const graduatePath = path.join(ROOT, "graduate", "index.html");
  const graduate = replaceGeneratedBlock(
    await readFile(graduatePath, "utf8"),
    "<!-- SEO_PROJECT_CARDS_START -->",
    "<!-- SEO_PROJECT_CARDS_END -->",
    projects.map(projectCardMarkup).join("\n"),
  );
  await writeFile(graduatePath, graduate, "utf8");

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

  await mapLimit(projects, 8, async (project, index) => {
    const directory = path.join(ROOT, "projects", project.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), projectPage(project, index, projects), "utf8");
  });

  await writeFile(path.join(ROOT, "sitemap.xml"), sitemapXml(videos, projects), "utf8");
  await writeFile(path.join(ROOT, "video-sitemap.xml"), videoSitemapXml(videos, titleSuffixes), "utf8");
  process.stdout.write(`Generated ${videos.length} watch pages, ${projects.length} project pages and two sitemaps.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
