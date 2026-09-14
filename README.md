# 빅데이터소프트웨어공학과 포트폴리오

[![2027학년도 빅데이터소프트웨어공학과 수시 1차 모집](https://ai.k-bigdata.kr/assets/promo/og-share-2027-susi1.png)](https://apply.jinhakapply.com/Notice/5041044/A)

<p align="center">
  <a href="https://apply.jinhakapply.com/Notice/5041044/A"><img src="https://img.shields.io/badge/2027학년도%20수시%201차-원서접수%20바로가기-CBFF3D?style=for-the-badge&labelColor=071A33" alt="2027학년도 수시 1차 원서접수 바로가기"></a>
</p>

> **원서접수 2026.09.07 — 10.01 23:59** · 입학하면 만들 수 있는 학생 프로젝트와 포트폴리오를 확인해 보세요.

한국폴리텍대학 서울강서캠퍼스 빅데이터소프트웨어공학과의 학생 결과물을 소개하는 웹사이트입니다.

## 페이지 구성

- `/` — 학과 전체 포트폴리오 안내
- `/graduate/` — 우리학과 졸업생 허ㅇ혜의 대표 프로젝트 8개와 수상 성과
- `/projects/프로젝트명/` — 대표 프로젝트별 문제·기여 내용·기술·구현 화면
- `/showcase/` — 학과 졸업생·재학생 소프트웨어 시연영상
- `/videos/영상ID/` — 영상별 상세 설명과 소프트웨어 시연

시연영상은 학과 [YouTube 채널](https://www.youtube.com/@kopo-poly/videos)의 제목을 기준으로 분류했습니다.

- 졸업작품: 82개
- 프로젝트실습: 173개
- 전체: 255개

## 연결 주소

- 포트폴리오: <https://portfolio.k-bigdata.kr/>
- 학과 홈페이지: <https://ai.k-bigdata.kr/>
- 교수 기술 블로그: <https://prof.k-bigdata.kr/>

GitHub Pages 배포는 `.github/workflows/pages.yml`에서 자동으로 진행됩니다. 배포가 끝나면 사이트맵의 전체 URL을 IndexNow 참여 검색엔진에 자동으로 알립니다.

YouTube에 새 영상 설명을 작성한 뒤 `node scripts/generate-seo.mjs --refresh-youtube`를 실행하면 공개된 작품 설명과 적용 기술이 영상 상세 페이지와 영상 사이트맵에 반영됩니다. 개발자 이름, 연락처, 개인 블로그·주소는 반영하지 않습니다.
