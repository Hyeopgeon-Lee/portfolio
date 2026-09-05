const SHOWCASE_DATA_URL = "/data/showcase-videos.json";
const PAGE_SIZE = 18;

const state = {
  videos: [],
  category: "all",
  query: "",
  limit: PAGE_SIZE,
};

const elements = {
  grid: document.querySelector("#video-grid"),
  empty: document.querySelector("#showcase-empty"),
  result: document.querySelector("#showcase-result"),
  more: document.querySelector("#load-more"),
  search: document.querySelector("#showcase-search"),
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
    const text = `${video.title} ${video.cohort ? `${video.cohort}기` : ""}`.toLocaleLowerCase("ko-KR");
    return matchesCategory && (!query || text.includes(query));
  });
}

function createVideoCard(video) {
  const article = document.createElement("article");
  article.className = "video-card";

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.videoId = video.id;
  button.setAttribute("aria-label", `${video.title} 영상 재생`);

  const thumb = document.createElement("div");
  thumb.className = "video-thumb";
  const image = document.createElement("img");
  image.src = thumbnailUrl(video.id);
  image.alt = "";
  image.loading = "lazy";
  image.width = 480;
  image.height = 360;
  thumb.append(image);

  const copy = document.createElement("div");
  copy.className = "video-card-copy";
  const meta = document.createElement("div");
  meta.className = "video-card-meta";
  const category = document.createElement("span");
  category.className = "video-category";
  category.textContent = categoryLabel(video.category);
  const cohort = document.createElement("small");
  cohort.textContent = video.cohort ? `${video.cohort}기` : "학생 작품";
  meta.append(category, cohort);
  const title = document.createElement("h2");
  title.textContent = video.title;
  copy.append(meta, title);
  button.append(thumb, copy);
  article.append(button);
  return article;
}

function render() {
  const matches = filteredVideos();
  const visible = matches.slice(0, state.limit);
  elements.grid.replaceChildren(...visible.map(createVideoCard));

  elements.result.textContent = `${matches.length.toLocaleString("ko-KR")}개의 영상 중 ${visible.length.toLocaleString("ko-KR")}개를 보고 있습니다.`;
  elements.empty.classList.toggle("visible", matches.length === 0);
  elements.more.hidden = visible.length >= matches.length;
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

async function loadShowcase() {
  try {
    const response = await fetch(SHOWCASE_DATA_URL);
    if (!response.ok) throw new Error("영상 목록을 불러오지 못했습니다.");
    state.videos = await response.json();

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

    render();
    const requestedVideo = params.get("video");
    if (requestedVideo) openVideo(state.videos.find((video) => video.id === requestedVideo));
  } catch (error) {
    elements.result.textContent = "영상 목록을 잠시 불러오지 못했습니다.";
    elements.empty.textContent = "YouTube 채널에서 영상을 확인해 주세요.";
    elements.empty.classList.add("visible");
    elements.more.hidden = true;
  }
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
    render();
  });
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

elements.grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-video-id]");
  if (button) openVideo(state.videos.find((video) => video.id === button.dataset.videoId));
});

elements.dialog.querySelector(".video-dialog-close").addEventListener("click", closeVideo);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeVideo();
});
elements.dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeVideo();
});

loadShowcase();
