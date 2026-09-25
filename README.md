# Y2V Music

YouTube 영상에서 최고 품질 오디오를 추출하는 개인용 웹앱.



## 주요 기능

- YouTube URL 입력 → 영상 정보 미리보기 (제목, 채널, 썸네일, 길이)
- 오디오 포맷 선택: MP3, M4A(AAC), OPUS(원본), FLAC
- 품질 선택: 최고 / 높음 / 보통
- YouTube 원본 스트림 품질 정보 표시
- ID3 태그 자동 삽입 (제목, 아티스트, 앨범아트)
- 다운로드 진행률 표시 (서버 처리 중 무한 표시 → 파일 전송 중 정확한 % 2단계)
- 다운로드 완료 알림 (저장한 파일명 표시)
- 인앱 사용법 가이드 (PC/모바일/FAQ 탭 모달)
- 라이트/다크 테마 전환 (시스템 설정 감지 + 수동 토글)
- YouTube Music 차트 탐색 (한국 Top 100, 글로벌 Top 100, 일본 Top 100, 장르별 플레이리스트)
- 곡 검색 (YouTube 검색 연동)
- 미리듣기 (선택한 트랙 바로 아래 인라인 YouTube 플레이어, ESC로 닫기)
- YouTube 429 rate limit 자동 재시도 (exponential backoff)
- 영상 정보 서버 캐시 (동일 영상 반복 조회 시 즉시 응답, shorts/embed/live URL 포함)

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
2. 썸네일 또는 ▶ 버튼으로 미리듣기 (트랙 바로 아래에 플레이어가 펼쳐짐)
3. ↓ 버튼으로 선택하면 상단 결과 카드로 자동 이동
4. 포맷과 품질 선택 후 다운로드

## 포맷별 품질

| 포맷 | 최고 | 높음 | 보통 | 비고 |
|------|------|------|------|------|
| MP3 | 320kbps | 192kbps | 128kbps | ID3v2.3 태그 + 앨범아트 |
| M4A | 256kbps | 192kbps | 128kbps | AAC 인코딩 + 앨범아트 |
| OPUS | 원본 | - | - | YouTube 원본 스트림 그대로 |
| FLAC | 원본 | - | - | 무손실 컨테이너 + 앨범아트 |

> YouTube 자체가 업로더의 원본을 재인코딩하므로, 추출 가능한 최대 품질은 YouTube가 제공하는 스트림의 상한(일반적으로 opus 160kbps)입니다.

## 제한사항

- YouTube Music 전용 콘텐츠(`music.youtube.com`에서만 재생 가능한 영상)는 다운로드할 수 없습니다.
- 일반 YouTube에서도 재생 가능한 영상만 지원합니다.
- **라이브 방송은 추출할 수 없습니다.** 끝이 없어 디스크를 무한정 소진하기 때문입니다.
- **영상 길이 3시간, 파일 500MB 상한**이 있습니다. 초과 시 안내 메시지와 함께 거부됩니다.
- 서버의 Cloudflare WARP 프록시가 간헐적으로 끊겨 다운로드가 실패할 때가 있습니다. 대부분 재시도하면 성공합니다. (원인 조사 중)

## 보안

개인용이지만 공개 URL로 운영되므로 최소한의 방어를 둡니다.

- **앨범아트 URL은 서버가 videoId로 직접 구성**합니다. 클라이언트가 보낸 임의 URL을 서버가 대신 요청하는 경로(SSRF)를 차단했습니다. 추가로 `i.ytimg.com` 허용목록, https 강제, 리다이렉트 거부, 5MB 크기 상한을 겁니다.
- **videoId 추출은 문자열 매칭이 아닌 `URL` 구조 파싱**입니다. `?xv=...&v=...` 같은 조작된 쿼리로 캐시를 오염시킬 수 없습니다.
- **앱 포트(3000)는 외부에 열려 있지 않습니다.** iptables 차단 + `127.0.0.1` 바인딩 이중 방어이며, 외부 접근은 nginx(80/443)를 통해서만 가능합니다.
- **임시 파일은 요청별 디렉터리에 격리**되어 성공·실패 어느 쪽이든 통째로 삭제됩니다. 기동 시 6시간 초과 잔여물을 자동 정리합니다.

> 현재 로그인 인증과 요청 수 제한은 없습니다. 동시 요청 보호 장치가 없으므로 링크를 널리 공유하지 마세요.

## 배포 환경

| 항목 | 내용 |
|------|------|
| 호스팅 | Oracle Cloud Free Tier |
| 인스턴스 | VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM) |
| OS | Ubuntu 24.04 |
| 리전 | South Korea North (Chuncheon) |
| SSL | Let's Encrypt (certbot, 자동 갱신) |
| 리버스 프록시 | nginx (80/443 → 127.0.0.1:3000) |
| 프로세스 관리 | PM2 fork 모드 (자동 재시작 + 부팅 시 자동 실행) |
| 외부 개방 포트 | 22 / 80 / 443 — 앱 포트 3000은 차단 |
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

### yt-dlp 업데이트

YouTube가 추출 방식을 주기적으로 바꾸므로, 다운로드가 `403 Forbidden`으로 실패하기 시작하면 먼저 yt-dlp를 최신으로 올립니다.

```bash
sudo python3 -m pip install -U --break-system-packages yt-dlp
pm2 restart y2vmusic
```

## 라이선스

개인 사용 목적. 비공개.
