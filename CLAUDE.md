# CLAUDE.md

## Project Overview

Y2V Music — YouTube 영상에서 최고 품질 오디오를 추출하는 개인용 웹앱.

- **프로덕션 URL**: https://y2vmusic.duckdns.org
- **서버**: Oracle Cloud Free Tier (Ubuntu 24.04, VM.Standard.E2.1.Micro)
- **서버 IP**: 152.67.198.0

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm (via corepack)
- **External CLI**: yt-dlp, ffmpeg (system PATH required)
- **Reverse Proxy**: nginx
- **SSL**: Let's Encrypt (certbot, 자동 갱신)
- **Process Manager**: PM2

## Commands

```bash
# 로컬 개발
corepack pnpm dev        # 개발 서버 (http://localhost:3000)
corepack pnpm build      # 프로덕션 빌드
corepack pnpm start      # 프로덕션 서버
corepack pnpm typecheck  # TypeScript 타입 체크
```

## Project Structure

```
app/
  layout.tsx              # 루트 레이아웃 (한국어, FOUC 방지 테마 스크립트)
  page.tsx                # 메인 단일 페이지 (클라이언트 컴포넌트, 테마 토글)
  globals.css             # CSS 변수 (라이트/다크) + Tailwind
  api/
    info/route.ts         # POST /api/info — 영상 정보 조회
    download/route.ts     # POST /api/download — 오디오 추출 및 다운로드
    charts/route.ts       # GET /api/charts — 차트/플레이리스트 조회 (YouTube Data API v3 + yt-dlp)
    search/route.ts       # POST /api/search — YouTube 검색 (yt-dlp ytsearch)
components/               # UI 컴포넌트 (url-input, video-info, format-selector, download-button, progress-bar)
  guide-modal.tsx           # 사용법 모달 (탭 전환, 반응형, ESC/오버레이 닫기)
  preview-player.tsx        # YouTube IFrame 미리듣기 플레이어 (별도 섹션)
  guide/
    pc-guide.tsx            # PC 사용법 (방법 A: URL 입력 5단계 + 방법 B: 탐색 4단계)
    mobile-guide.tsx        # 모바일 사용법 (방법 A: URL 입력 5단계 + 방법 B: 탐색 4단계)
    faq.tsx                 # FAQ 아코디언 (8항목)
  explore/
    explore-section.tsx     # 탐색 섹션 컨테이너 (검색바 + 카테고리 + 트랙 리스트)
    search-bar.tsx          # 검색 입력 컴포넌트
    category-pills.tsx      # 카테고리 필 버튼 (가로 스크롤)
    track-list.tsx          # 트랙 리스트 + 더 보기 페이지네이션
    track-item.tsx          # 트랙 아이템 (모바일: 아이콘 버튼, 데스크탑: 텍스트 버튼)
lib/
  ytdlp.ts               # yt-dlp CLI 래퍼 (getVideoInfo, downloadAudio, searchYouTube, fetchPlaylistFromYtDlp) + 429 재시도
  youtube-api.ts          # YouTube Data API v3 래퍼 (fetchPlaylistFromApi)
  playlists.ts            # 플레이리스트 ID 정의 + 메타데이터
  chart-cache.ts          # 서버 캐시 — 차트 데이터 (Map 기반, TTL 2시간)
  info-cache.ts           # 서버 캐시 — 영상 info (Map 기반, TTL 10분)
  ffmpeg.ts               # ffmpeg CLI 래퍼 (convert, 메타데이터/앨범아트 삽입)
  process.ts              # child_process.spawn 래퍼 (PATH 보강 포함)
  validate.ts             # YouTube URL 유효성 검사
  temp.ts                 # 임시 파일 생성/정리
  thumbnail.ts            # 썸네일 다운로드 (앨범아트용)
```

## Architecture Decisions

- **spawn 사용**: shell injection 방지를 위해 exec 대신 spawn 사용
- **PATH 보강**: `lib/process.ts`에서 환경별 PATH 자동 추가 (Windows: WinGet 경로, Linux: ~/.deno/bin)
- **DB 없음**: 개인용이므로 다운로드 이력 미저장
- **임시 파일**: UUID 기반 생성, 스트림 완료/에러 시 try/finally로 정리
- **ID3 태그**: ffmpeg로 MP3/M4A/FLAC 변환 시 제목, 아티스트, 앨범아트 자동 삽입
- **하이브리드 차트**: PL 접두사 차트는 YouTube Data API v3, RDCLAK5uy_ 장르 플레이리스트는 yt-dlp로 분기 처리
- **서버 캐시**: 차트 데이터는 메모리 Map에 2시간 TTL로 캐시, 영상 info는 10분 TTL로 캐시 (DB 미사용)
- **429 재시도**: yt-dlp의 모든 호출에 exponential backoff 재시도 적용 (최대 2회, 3초→9초 간격, HTTP 429만 대상)
- **다운로드 메타데이터 전달**: 클라이언트가 info 조회 시 받은 title/channel/thumbnail을 다운로드 요청에 포함하여 서버 측 중복 info 호출 제거
- **미리듣기**: YouTube IFrame 임베드, 자동 재생 없음
- **테마**: CSS 변수 기반 라이트/다크 전환, `data-theme` 속성 + localStorage 저장, FOUC 방지 인라인 스크립트
- **반응형 트랙 버튼**: 모바일(< 640px) 아이콘 버튼, 데스크탑(≥ 640px) 텍스트 버튼

## Deployment

### 서버 정보
- **호스팅**: Oracle Cloud Free Tier (ap-chuncheon-1, South Korea North)
- **인스턴스**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **OS**: Ubuntu 24.04
- **도메인**: y2vmusic.duckdns.org (DuckDNS 무료 서브도메인)

### 서버 구성
- **nginx**: 리버스 프록시 (80/443 → localhost:3000)
- **certbot**: Let's Encrypt SSL 자동 갱신
- **PM2**: Next.js 프로세스 관리 (자동 재시작, 시스템 부팅 시 자동 실행)
- **deno**: yt-dlp의 YouTube JS 챌린지 해독용 런타임 (~/.deno/bin)
- **Cloudflare WARP**: yt-dlp 프록시 (socks5://127.0.0.1:40000) — 클라우드 IP 봇 차단 우회
- **yt-dlp config**: `~/.config/yt-dlp/config` — `--remote-components ejs:github`, `--proxy socks5://127.0.0.1:40000`
- **환경 변수**: `.env.local` — `YOUTUBE_API_KEY` (YouTube Data API v3 차트 조회용)

### Cloudflare WARP (YouTube 봇 차단 우회)
- YouTube가 클라우드 IP를 봇으로 차단하므로 Cloudflare WARP를 SOCKS5 프록시로 사용
- 모드: `proxy` (전체 트래픽이 아닌 로컬 SOCKS5 프록시만, SSH 등 영향 없음)
- 포트: 40000 (`warp-cli proxy port 40000`)
- 서비스: `warp-svc` (systemd, 부팅 시 자동 시작 + 자동 재연결)
- yt-dlp config에서 `--proxy socks5://127.0.0.1:40000`으로 참조
- 쿠키 불필요 (WARP 네트워크를 통해 YouTube가 봇으로 인식하지 않음)

### SSH 접속
```bash
ssh -i D:/sshkey/ssh-key-2026-05-25.key ubuntu@152.67.198.0
```

### 서버 관리 명령어
```bash
pm2 status                    # 프로세스 상태 확인
pm2 logs y2vmusic             # 로그 확인
pm2 restart y2vmusic          # 재시작

sudo systemctl status nginx   # nginx 상태
sudo systemctl restart nginx  # nginx 재시작

sudo certbot renew --dry-run  # SSL 갱신 테스트

warp-cli status               # WARP 연결 상태
warp-cli connect               # WARP 연결
warp-cli disconnect            # WARP 연결 해제
```

### 서버 배포 (업데이트 시)
```bash
ssh -i D:/sshkey/ssh-key-2026-05-25.key ubuntu@152.67.198.0
cd ~/Y2Vmusic
git pull
pnpm install
pnpm build
pm2 restart y2vmusic
```

### Oracle Cloud 네트워크 설정
- VCN: y2v-vcn (10.0.0.0/16)
- Internet Gateway 연결 + Route Table에 0.0.0.0/0 규칙
- Security List Ingress: 22(SSH), 80(HTTP), 443(HTTPS), 3000(Next.js)
- OS iptables: 위와 동일 포트 허용, REJECT 규칙 앞에 배치

## Conventions

- UI 언어: 한국어
- 라이트/다크 테마 (시스템 설정 감지 + 수동 토글, localStorage 저장)
- API 에러 응답: `{ "error": "메시지" }` 형식
- 포맷 옵션: MP3 (320/192/128), M4A (256/192/128), OPUS (원본), FLAC
- 플레이리스트 ID 관리: `lib/playlists.ts`에 집중 (ID 변경 시 이 파일만 수정)

## Known Limitations

- **YouTube Music 전용 콘텐츠 미지원**: `music.youtube.com`에서만 재생 가능한 영상(YouTube Music Premium 전용)은 yt-dlp로 추출 불가. YouTube Music Premium 계정 쿠키 + `web_music` 클라이언트가 필요하며, 현재 지원하지 않음.
- **서버 OOM**: Oracle Cloud 1GB RAM 인스턴스에서 `pnpm build` 시 TypeScript 타입 체크 단계에서 간헐적 OOM 발생. 빌드 실패 시 Oracle Cloud Console에서 서버 리부팅 후 재시도.
