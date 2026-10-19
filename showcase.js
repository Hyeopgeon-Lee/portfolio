const PAGE_SIZE = 18;

const state = {
  videos: [],
  category: "all",
  year: "all",
  query: "",
  limit: PAGE_SIZE,
};

const elements = {
  grid: document.querySelector("#video-grid"),
  empty: document.querySelector("#showcase-empty"),
  result: document.querySelector("#showcase-result"),
  more: document.querySelector("#load-more"),
  search: document.querySelector("#showcase-search"),
  year: document.querySelector("#showcase-year"),
  dialog: document.querySelector("#video-dialog"),
  frame: document.querySelector("#video-frame"),
  dialogTitle: document.querySelector("#video-dialog-title"),
  youtubeLink: document.querySelector("#video-youtube-link"),
};

const categoryLabel = (category) =>
  category === "graduate" ? "졸업작품" : "프로젝트실습";

const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function filteredVideos() {
  const query = state.query.trim().toLocaleLowerCase("ko-KR");
  return state.videos.filter((video) => {
    const matchesCategory = state.category === "all" || video.category === state.category;
    const matchesYear = state.year === "all" || video.year === state.year;
    return matchesCategory && matchesYear && (!query || video.search.includes(query));
  });
}

function render() {
  const matches = filteredVideos();
  const visible = new Set(matches.slice(0, state.limit));
  state.videos.forEach((video) => {
    video.element.hidden = !visible.has(video);
  });

  const categoryName = state.category === "graduate" ? "졸업작품" :
    state.category === "practice" ? (state.year === "2026" ? "프로젝트" : "프로젝트실습") : "시연영상";
  const selectedTitle = `${state.year === "all" ? "전체" : state.year + "년"} ${categoryName}`;
  const heading = document.querySelector("#showcase-selection");
  if (heading) heading.textContent = selectedTitle;
  elements.result.textContent = `${matches.length.toLocaleString("ko-KR")}개 중 ${visible.size.toLocaleString("ko-KR")}개를 보고 있습니다.`;
  elements.empty.classList.toggle("visible", matches.length === 0);
  elements.more.hidden = visible.size >= matches.length;
  const pending = document.querySelector("#pending-2026-videos");
  if (pending) {
    const hasUnverifiedLinks = pending.querySelectorAll("[data-pending-id]").length > 0;
    // These are directly confirmed 2026 graduation URLs, not 2025 works.
    pending.hidden = !hasUnverifiedLinks ||
      !["all", "graduate"].includes(state.category) ||
      !["all", "2026"].includes(state.year) ||
      Boolean(state.query.trim());
  }
}

function openVideo(video) {
  if (!video) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`;
  iframe.title = `${video.title} 영상`;
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  elements.frame.replaceChildren(iframe);
  elements.dialogTitle.textContent = video.title;
  elements.youtubeLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
  elements.dialog.showModal();
  document.body.classList.add("modal-open");
}

function closeVideo() {
  elements.dialog.close();
  elements.frame.replaceChildren();
  document.body.classList.remove("modal-open");
}

function loadShowcase() {
  state.videos = [...elements.grid.querySelectorAll(".video-card")].map((element) => ({
    id: element.dataset.videoId,
    title: element.dataset.title,
    category: element.dataset.category,
    cohort: element.dataset.cohort,
    year: element.dataset.year || "",
    search: element.dataset.search,
    element,
  }));

  const graduated2026 = state.videos.filter((video) => video.year === "2026" && video.category === "graduate").length;
  const projects2026 = state.videos.filter((video) => video.year === "2026" && video.category === "practice").length;
  const controls = document.querySelector(".showcase-controls");
  if (controls) {
    const quick = document.createElement("div");
    quick.className = "showcase-2026-paths";
    quick.setAttribute("aria-label", "2026년 졸업작품과 프로젝트");
    quick.innerHTML = '<a class="showcase-2026-path" href="/showcase/?category=graduate&amp;year=2026"><small>2026 FINAL WORKS</small><span>2026년 졸업작품 <strong data-2026-graduate-count></strong>편</span><p>기능을 확장·개선한 최종 결과물</p></a><a class="showcase-2026-path" href="/showcase/?category=practice&amp;year=2026"><small>2026 DEVELOPMENT</small><span>2026년 프로젝트 <strong data-2026-practice-count></strong>편</span><p>초기 개발·시연 단계의 프로젝트</p></a>';
    controls.before(quick);
    const heading = document.createElement("h2");
    heading.className = "showcase-selection";
    heading.id = "showcase-selection";
    heading.textContent = "전체 시연영상";
    controls.before(heading);
  }
  document.querySelectorAll("[data-2026-graduate-count]").forEach((el) => { el.textContent = graduated2026.toLocaleString("ko-KR"); });
  document.querySelectorAll("[data-2026-practice-count]").forEach((el) => { el.textContent = projects2026.toLocaleString("ko-KR"); });
  const graduateCount = state.videos.filter((video) => video.category === "graduate").length;
  const practiceCount = state.videos.filter((video) => video.category === "practice").length;
  document.querySelectorAll("[data-total-count]").forEach((element) => { element.textContent = state.videos.length.toLocaleString("ko-KR"); });
  document.querySelectorAll("[data-graduate-count]").forEach((element) => { element.textContent = graduateCount.toLocaleString("ko-KR"); });
  document.querySelectorAll("[data-practice-count]").forEach((element) => { element.textContent = practiceCount.toLocaleString("ko-KR"); });

  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get("category");
  if (["graduate", "practice"].includes(requestedCategory)) {
    state.category = requestedCategory;
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === requestedCategory;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  const requestedYear = params.get("year");
  if (requestedYear && [...elements.year.options].some((option) => option.value === requestedYear)) {
    state.year = requestedYear;
    elements.year.value = requestedYear;
  }
  render();
  const requestedVideo = params.get("video");
  if (requestedVideo) openVideo(state.videos.find((video) => video.id === requestedVideo));
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.filter;
    state.limit = PAGE_SIZE;
    document.querySelectorAll("[data-filter]").forEach((filterButton) => {
      const active = filterButton === button;
      filterButton.classList.toggle("active", active);
      filterButton.setAttribute("aria-pressed", String(active));
    });
    syncFiltersUrl();
    render();
  });
});

function syncFiltersUrl() {
  const url = new URL(window.location.href);
  if (state.category === "all") url.searchParams.delete("category");
  else url.searchParams.set("category", state.category);
  if (state.year === "all") url.searchParams.delete("year");
  else url.searchParams.set("year", state.year);
  history.replaceState(null, "", url);
}

elements.year.addEventListener("change", () => {
  state.year = elements.year.value;
  state.limit = PAGE_SIZE;
  syncFiltersUrl();
  render();
});

elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  state.limit = PAGE_SIZE;
  render();
});

elements.more.addEventListener("click", () => {
  state.limit += PAGE_SIZE;
  render();
});

// Card links now follow their canonical detail pages normally.
// Embedded playback can be disabled for individual YouTube videos; every card
// has a separate direct YouTube watch link as an accessible alternative.

loadShowcase();
