# Y2V Music

YouTube 영상에서 최고 품질 오디오를 추출하는 개인용 웹앱.



## 주요 기능

- YouTube URL 입력 → 영상 정보 미리보기 (제목, 채널, 썸네일, 길이)
- 오디오 포맷 선택: MP3, M4A(AAC), OPUS(원본), FLAC
- 품질 선택: 최고 / 높음 / 보통
- YouTube 원본 스트림 품질 정보 표시
- ID3 태그 자동 삽입 (제목, 아티스트, 앨범아트)
- 다운로드 진행률 표시
- 인앱 사용법 가이드 (PC/모바일/FAQ 탭 모달)
- YouTube Music 차트 탐색 (한국 Top 100, 글로벌 Top 100, 장르별 플레이리스트)
- 곡 검색 (YouTube 검색 연동)
- 미리듣기 (YouTube 임베드 플레이어)

## 기술 스택

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- YouTube Data API v3 (차트 조회)
- yt-dlp (오디오 스트림 추출 + 검색 + 장르 플레이리스트)
- ffmpeg (포맷 변환 + 메타데이터 삽입)

## 선행 요구사항

| 도구 | 설치 방법 (Windows) | 설치 방법 (Linux) |
|------|---------------------|-------------------|
| Node.js 22+ | [nodejs.org](https://nodejs.org) | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo bash - && sudo apt install nodejs` |
| pnpm | `corepack enable` | `npm install -g pnpm` |
| yt-dlp | `winget install yt-dlp.yt-dlp` | `sudo pip3 install yt-dlp` |
| ffmpeg | `winget install Gyan.FFmpeg` | `sudo apt install ffmpeg` |

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버
pnpm dev
```

http://localhost:3000 에서 접속.

## 사용법

**방법 A — URL 직접 입력**
1. YouTube URL을 입력하고 검색 버튼 클릭
2. 영상 정보를 확인한 뒤 원하는 포맷과 품질 선택
3. 다운로드 버튼 클릭 → 파일 저장

**방법 B — 차트/검색에서 선택**
1. 탐색 섹션에서 차트(한국 Top 100, K-Pop, 힙합 등) 또는 검색으로 곡 탐색
2. 썸네일 클릭으로 미리듣기, ↓ 버튼으로 선택
3. 포맷과 품질 선택 후 다운로드

## 포맷별 품질

| 포맷 | 최고 | 높음 | 보통 | 비고 |
|------|------|------|------|------|
| MP3 | 320kbps | 192kbps | 128kbps | ID3v2.3 태그 + 앨범아트 |
| M4A | 256kbps | 192kbps | 128kbps | AAC 인코딩 + 앨범아트 |
| OPUS | 원본 | - | - | YouTube 원본 스트림 그대로 |
| FLAC | 원본 | - | - | 무손실 컨테이너 + 앨범아트 |

> YouTube 자체가 업로더의 원본을 재인코딩하므로, 추출 가능한 최대 품질은 YouTube가 제공하는 스트림의 상한(일반적으로 opus 160kbps)입니다.

## 배포 환경

| 항목 | 내용 |
|------|------|
| 호스팅 | Oracle Cloud Free Tier |
| 인스턴스 | VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM) |
| OS | Ubuntu 24.04 |
| 리전 | South Korea North (Chuncheon) |
| SSL | Let's Encrypt (certbot, 자동 갱신) |
| 리버스 프록시 | nginx (80/443 → localhost:3000) |
| 프로세스 관리 | PM2 (자동 재시작 + 부팅 시 자동 실행) |
| JS 런타임 | deno (yt-dlp YouTube JS 챌린지 해독용) |
| YouTube 봇 우회 | Cloudflare WARP (SOCKS5 프록시, 쿠키 불필요) |
| 차트 API | YouTube Data API v3 (`YOUTUBE_API_KEY` 환경 변수) |

### 서버 업데이트

```bash
ssh -i <key> ubuntu@Your server ip
cd ~/Y2Vmusic
git pull
pnpm install
pnpm build
pm2 restart y2vmusic
```

### Cloudflare WARP (YouTube 봇 차단 우회)

클라우드 서버 IP가 YouTube에 의해 봇으로 차단되므로, Cloudflare WARP를 SOCKS5 프록시 모드로 사용합니다. 쿠키 갱신이 불필요합니다.

```bash
warp-cli status      # 상태 확인
warp-cli connect     # 연결
warp-cli disconnect  # 연결 해제
```

## 라이선스

개인 사용 목적. 비공개.
