const DATA_URL = "/data/showcase-videos.json";

const categoryLabel = (category) =>
  category === "graduate" ? "졸업작품" : "프로젝트실습";

const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

async function loadHub() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("영상 목록을 불러오지 못했습니다.");

    const videos = await response.json();
    const graduateCount = videos.filter((video) => video.category === "graduate").length;
    const practiceCount = videos.filter((video) => video.category === "practice").length;

    document.querySelectorAll("[data-total-count]").forEach((element) => {
      element.textContent = element.tagName === "SPAN" ? `${videos.length} VIDEOS` : videos.length.toLocaleString("ko-KR");
    });
    document.querySelectorAll("[data-graduate-count]").forEach((element) => {
      element.textContent = graduateCount.toLocaleString("ko-KR");
    });
    document.querySelectorAll("[data-practice-count]").forEach((element) => {
      element.textContent = practiceCount.toLocaleString("ko-KR");
    });

    const featured = document.querySelector("#featured-video-image");
    if (featured && videos[0]) {
      const image = document.createElement("img");
      image.src = thumbnailUrl(videos[0].id);
      image.alt = "";
      image.loading = "lazy";
      featured.replaceChildren(image);
    }

    const latestGrid = document.querySelector("#latest-grid");
    if (latestGrid) {
      latestGrid.replaceChildren(
        ...videos.slice(0, 3).map((video) => {
          const link = document.createElement("a");
          link.className = "latest-card";
          link.href = `/showcase/?video=${encodeURIComponent(video.id)}`;

          const image = document.createElement("img");
          image.src = thumbnailUrl(video.id);
          image.alt = `${video.title} 영상 미리보기`;
          image.loading = "lazy";

          const copy = document.createElement("div");
          copy.className = "latest-card-copy";
          const meta = document.createElement("small");
          meta.textContent = `${categoryLabel(video.category)}${video.cohort ? ` · ${video.cohort}기` : ""}`;
          const title = document.createElement("h3");
          title.textContent = video.title;
          copy.append(meta, title);
          link.append(image, copy);
          return link;
        }),
      );
    }
  } catch (error) {
    const latestGrid = document.querySelector("#latest-grid");
    if (latestGrid) {
      latestGrid.innerHTML = '<p class="showcase-empty visible">영상 목록을 잠시 불러오지 못했습니다. YouTube 채널에서 확인해 주세요.</p>';
    }
  }
}

loadHub();
