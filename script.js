const projects = [
  {
    id: "01",
    title: "아두이노 신체 놀이학습 서비스",
    short: "센서 발판과 자연어 처리를 결합한 영유아 올인원 학습 서비스",
    categories: ["ai", "backend", "public"],
    categoryLabel: "EDUTECH · IOT",
    period: "2022.03—11",
    role: "팀장",
    award: "한이음 ICT 공모전 입상",
    summary: "영유아의 신체·언어 발달을 돕기 위해 학습 데이터와 아두이노 센서 발판을 연결한 인터랙티브 서비스입니다.",
    highlights: [
      "Flask API와 KoNLPy Okt를 활용한 형태소 분석 및 품사별 문제 생성",
      "MQTT로 아두이노 센서 데이터와 Spring 서버를 실시간 연동",
      "회원·학습 이력 기능 개발과 AWS EC2 배포, 버그 수정"
    ],
    stack: ["Java", "Spring", "Python", "Flask", "KoNLPy", "MQTT", "Arduino", "AWS"],
    images: ["/assets/projects/project-01-overview.png", "/assets/projects/project-01-architecture.png"],
    captions: ["프로젝트 개요와 주요 역할", "서비스 구성도"]
  },
  {
    id: "02",
    title: "ALS 환자 커뮤니케이션 플랫폼",
    short: "시선 추적과 안구 마우스로 의사소통 장벽을 낮춘 접근성 플랫폼",
    categories: ["ai", "backend", "public"],
    categoryLabel: "ACCESSIBILITY · VISION AI",
    period: "2022.09—12",
    role: "팀원",
    award: "프로보노 ICT 공모전 동상",
    summary: "전신 근육 사용이 어려운 루게릭병 환자가 시선으로 화면을 조작하고 보호자와 소통할 수 있도록 만든 커뮤니케이션 플랫폼입니다.",
    highlights: [
      "WebGazer.js와 OpenCV 기반 안구 마우스 및 시선 좌표 최적화",
      "OpenCV 얼굴 인식 기반 Face ID 로그인과 사용자 데이터 저장",
      "WebRTC 화상채팅 및 긴급상황 보호자 문자 전송 기능 구현"
    ],
    stack: ["Java", "Node.js", "OpenCV", "WebGazer.js", "WebRTC", "JPA", "AWS"],
    images: ["/assets/projects/project-02-overview.png", "/assets/projects/project-02-architecture.png"],
    captions: ["프로젝트 개요와 주요 역할", "서비스 기능도"]
  },
  {
    id: "03",
    title: "자연어 처리 여행지 추천 서비스",
    short: "리뷰의 감성을 분석해 신뢰도 높은 여행지를 제안하는 서비스",
    categories: ["ai", "backend"],
    categoryLabel: "NLP · RECOMMENDATION",
    period: "2022.08—11",
    role: "팀장",
    award: "과학기술정보통신부장관상",
    summary: "홍보성 리뷰와 실제 경험을 구분하기 어려운 문제에 주목해 여행 후기의 긍정·부정을 분석하고 관심 정보에 맞는 여행지를 추천했습니다.",
    highlights: [
      "TensorFlow·Keras·LSTM 기반 20만 건 리뷰 감성 분석",
      "KoNLPy 형태소 분석과 오피니언 마이닝 파이프라인 구축",
      "Spring Security와 JWT 인증, 여행 일정 공유 기능 구현"
    ],
    stack: ["Java", "Spring Boot", "Python", "Flask", "TensorFlow", "LSTM", "KoNLPy", "K-PaaS"],
    images: ["/assets/projects/project-03-overview.png", "/assets/projects/project-03-pipeline.png"],
    captions: ["프로젝트 개요와 주요 역할", "오피니언 마이닝 파이프라인"]
  },
  {
    id: "04",
    title: "분리배출·환경 트렌드 분석",
    short: "이미지 분류와 뉴스 NLP로 친환경 실천을 돕는 업사이클링 서비스",
    categories: ["ai", "backend", "public"],
    categoryLabel: "VISION AI · MSA",
    period: "2022.09—12",
    role: "팀원",
    award: "NIA 원장상 · 특별상",
    summary: "재활용품 이미지를 인식해 분리배출 방법을 안내하고, 환경 뉴스를 분석해 최신 트렌드를 시각화하는 업사이클링 공방 플랫폼입니다.",
    highlights: [
      "Teachable Machine 이미지 모델과 Flask REST API 기반 재활용품 인식",
      "Spring Cloud Gateway·Security를 적용한 MSA 구조 설계",
      "환경 뉴스 수집·자연어 처리와 JqCloud 워드클라우드 시각화"
    ],
    stack: ["Java", "Spring Boot", "Spring Cloud", "Python", "Flask", "MSA", "K-PaaS", "NLP"],
    images: ["/assets/projects/project-04-overview.png", "/assets/projects/project-04-architecture.png"],
    captions: ["프로젝트 개요와 주요 역할", "MSA 서비스 기능도"]
  },
  {
    id: "05",
    title: "국가위기 데이터 파이프라인 실증",
    short: "공공 API를 연결해 감염병 현황과 의료시설 정보를 제공한 위기대응 서비스",
    categories: ["backend", "public"],
    categoryLabel: "PUBLIC DATA · CRISIS RESPONSE",
    period: "2022.12.19—23",
    role: "개인",
    award: "NIA 민간협력 프로젝트",
    summary: "국가위기 상황에서 필요한 데이터를 빠르게 활용할 수 있도록 감염병 현황, 병원, 보건소와 길찾기를 하나의 서비스로 검증했습니다.",
    highlights: [
      "질병관리청·보건복지부 공공 API를 활용한 확진자 및 감염병 통계 제공",
      "Kakao Map 기반 지역별 현황 시각화와 병원·보건소 길찾기",
      "위기대응 시나리오 기반 데이터 파이프라인 검증"
    ],
    stack: ["Java", "Spring Boot", "JavaScript", "Public API", "Kakao Map", "Data Pipeline"],
    images: ["/assets/projects/project-05-overview.png", "/assets/projects/project-05-api.png"],
    captions: ["프로젝트 개요와 주요 역할", "공공 API 기반 코로나 현황"]
  },
  {
    id: "06",
    title: "교통약자 대중교통 소통 플랫폼",
    short: "음성 길찾기와 혼잡도 분석으로 이동권을 지원하는 올인원 웹앱",
    categories: ["ai", "backend", "public"],
    categoryLabel: "MOBILITY · PUBLIC DATA",
    period: "2023.03—06",
    role: "팀장",
    award: "대상 · 서울특별시장상",
    summary: "디지털 접근이 어려운 사용자를 위해 음성 길찾기, 실시간 교통·재난 정보와 지역 채팅을 한곳에 담은 맞춤형 이동 지원 서비스입니다.",
    highlights: [
      "STT 음성인식 기반 대중교통 길찾기와 도착지 상황 정보 제공",
      "Spring Batch로 대용량 혼잡도 데이터를 수집해 MongoDB에 저장",
      "Chart.js 혼잡도 시각화와 WebSocket 실시간 지역 채팅"
    ],
    stack: ["Java", "Spring Boot", "Spring Cloud", "STT", "Spring Batch", "MongoDB", "Chart.js", "MSA"],
    images: ["/assets/projects/project-06-overview.png", "/assets/projects/project-06-flow.png"],
    captions: ["프로젝트 개요와 주요 역할", "서비스 흐름도"]
  },
  {
    id: "07",
    title: "장애부모 감정 소통 플랫폼",
    short: "KoBERT 감정분석과 생성형 AI를 결합한 보호자 소통 서비스",
    categories: ["ai", "backend", "public"],
    categoryLabel: "EMOTION AI · SOCIAL CARE",
    period: "2023.03 시작",
    role: "팀장",
    award: "프로보노 ICT 공모전",
    summary: "장애 자녀를 양육하는 부모의 감정 표현과 교류를 돕고, 흩어진 복지·의료 정보를 가독성 있게 제공하는 플랫폼입니다.",
    highlights: [
      "37,212개 텍스트로 LSTM·Bi-LSTM·GRU·KoBERT 성능 비교 후 KoBERT 채택",
      "다이어리 감정 분석, Chart.js 시각화와 AI 이미지 생성 연동",
      "WebSocket·Redis 기반 유사 감정 보호자 채팅과 위치 기반 병원 정보"
    ],
    stack: ["Java", "Spring Boot", "Python", "KoBERT", "Redis", "WebSocket", "Chart.js", "Generative AI"],
    images: ["/assets/projects/project-07-overview.png", "/assets/projects/project-07-flow.png"],
    captions: ["프로젝트 개요와 주요 역할", "서비스 흐름도"]
  },
  {
    id: "08",
    title: "OCR 세무 업무 도움 플랫폼",
    short: "세금 고지서 인식부터 일정·상담까지 연결한 개인사업자 지원 서비스",
    categories: ["ai", "backend", "public"],
    categoryLabel: "OCR · BUSINESS SUPPORT",
    period: "2023.03 시작",
    role: "팀원",
    award: "한이음 ICT 공모전",
    summary: "세무 지식이 부족한 개인사업자가 고지서를 쉽게 확인하고 세무 일정과 상담을 한곳에서 관리하도록 돕는 플랫폼입니다.",
    highlights: [
      "CLOVA OCR로 세금 고지서 정보를 추출해 MariaDB에 저장",
      "Object Storage 기반 고지서 이미지 관리와 OCR API 통신",
      "FullCalendar 세무 일정, CLOVA Chatbot과 실시간 세무사 채팅"
    ],
    stack: ["Java", "Spring Boot", "CLOVA OCR", "Object Storage", "MariaDB", "Redis", "WebSocket", "FullCalendar"],
    images: ["/assets/projects/project-08-overview.png", "/assets/projects/project-08-flow.png"],
    captions: ["프로젝트 개요와 주요 역할", "서비스 흐름도"]
  }
];

const projectGrid = document.querySelector("#project-grid");
const dialog = document.querySelector("#project-dialog");
const dialogContent = document.querySelector("#dialog-content");
const filterButtons = document.querySelectorAll(".filter-button");

function renderProjects() {
  projectGrid.innerHTML = projects.map((project) => `
    <article class="project-card" data-categories="${project.categories.join(" ")}">
      <button class="project-card-button" type="button" data-project="${project.id}" aria-label="${project.title} 상세 보기">
        <div class="project-image"><img src="${project.images[0]}" alt="${project.title} 프로젝트 소개 화면" loading="lazy" /></div>
        <div class="project-copy">
          <div class="project-meta"><span>${project.id} / ${project.categoryLabel}</span><span class="project-award">${project.award}</span></div>
          <h3>${project.title}</h3>
          <p>${project.short}</p>
          <div class="project-bottom">
            <div class="project-tags">${project.stack.slice(0, 4).map((item) => `<span>${item}</span>`).join("")}</div>
            <span class="project-arrow" aria-hidden="true">↗</span>
          </div>
        </div>
      </button>
    </article>
  `).join("");
}

function openProject(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;

  dialogContent.innerHTML = `
    <section class="dialog-hero">
      <div class="dialog-kicker"><span>PROJECT ${project.id}</span><span>${project.categoryLabel}</span></div>
      <h2 id="dialog-title">${project.title}</h2>
    </section>
    <div class="dialog-body">
      <p class="dialog-summary">${project.summary}</p>
      <div class="dialog-info">
        <div><span>PERIOD</span><strong>${project.period}</strong></div>
        <div><span>ROLE</span><strong>${project.role}</strong></div>
        <div><span>RESULT</span><strong>${project.award}</strong></div>
      </div>
      <div class="dialog-columns">
        <section class="dialog-section"><h3>CONTRIBUTION</h3><ul>${project.highlights.map((item) => `<li>${item}</li>`).join("")}</ul></section>
        <section class="dialog-section"><h3>TECH STACK</h3><div class="dialog-stack">${project.stack.map((item) => `<span>${item}</span>`).join("")}</div></section>
      </div>
      <div class="dialog-gallery">
        ${project.images.map((image, index) => `<figure><img src="${image}" alt="${project.title} ${project.captions[index]}" loading="lazy" /><figcaption>${project.captions[index]}</figcaption></figure>`).join("")}
      </div>
    </div>
  `;

  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function closeDialog() {
  dialog.close();
  document.body.classList.remove("dialog-open");
}

renderProjects();

projectGrid.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-project]");
  if (trigger) openProject(trigger.dataset.project);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelectorAll(".project-card").forEach((card) => {
      const matches = selected === "all" || card.dataset.categories.split(" ").includes(selected);
      card.classList.toggle("hidden", !matches);
    });
  });
});

document.querySelector(".dialog-close").addEventListener("click", closeDialog);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});
dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
