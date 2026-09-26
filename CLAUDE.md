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
  page.tsx                # 메인 단일 페이지 (클라이언트 컴포넌트, 테마 토글, 결과 자동 스크롤, 다운로드 진행/완료 처리)
  globals.css             # CSS 변수 (라이트/다크) + Tailwind
  api/
    info/route.ts         # POST /api/info — 영상 정보 조회
    download/route.ts     # POST /api/download — 오디오 추출 및 다운로드
    charts/route.ts       # GET /api/charts — 차트/플레이리스트 조회 (YouTube Data API v3 + yt-dlp)
    search/route.ts       # POST /api/search — YouTube 검색 (yt-dlp ytsearch)
components/               # UI 컴포넌트 (url-input, video-info, format-selector, download-button, progress-bar)
  guide-modal.tsx           # 사용법 모달 (탭 전환, 반응형, ESC/오버레이 닫기)
  preview-player.tsx        # YouTube IFrame 미리듣기 플레이어 (선택 트랙 바로 아래 인라인, ESC/✕ 닫기)
  guide/
    pc-guide.tsx            # PC 사용법 (방법 A: URL 입력 5단계 + 방법 B: 탐색 4단계)
    mobile-guide.tsx        # 모바일 사용법 (방법 A: URL 입력 5단계 + 방법 B: 탐색 4단계)
    faq.tsx                 # FAQ 아코디언 (8항목)
  explore/
    explore-section.tsx     # 탐색 섹션 컨테이너 (검색바 + 카테고리 + 트랙 리스트)
    search-bar.tsx          # 검색 입력 컴포넌트
    category-pills.tsx      # 카테고리 필 버튼 (가로 스크롤)
    track-list.tsx          # 트랙 리스트 + 더 보기 페이지네이션 + 인라인 미리듣기(활성 트랙 상태 관리, 트랙 변경 시 닫힘)
    track-item.tsx          # 트랙 아이템 (모바일: 아이콘 버튼, 데스크탑: 텍스트 버튼, 미리듣기 토글 aria-expanded)
lib/
  admission.ts           # 비싼 작업 동시 실행 제한 (download 1 / metadata 2, 503 + Retry-After)
  ytdlp.ts               # yt-dlp CLI 래퍼 (getVideoInfo, downloadAudio, searchYouTube, fetchPlaylistFromYtDlp) + 429 재시도 + 라이브/길이/용량 상한
  youtube-api.ts          # YouTube Data API v3 래퍼 (fetchPlaylistFromApi)
  playlists.ts            # 플레이리스트 ID 정의 + 메타데이터
  chart-cache.ts          # 서버 캐시 — 차트 데이터 (Map 기반, TTL 2시간)
  info-cache.ts           # 서버 캐시 — 영상 info (Map 기반, TTL 10분)
  ffmpeg.ts               # ffmpeg CLI 래퍼 (convert, 메타데이터/앨범아트 삽입)
  process.ts              # child_process.spawn 래퍼 (PATH 보강, 우선순위 양보, 작업 데드라인, 프로세스 그룹 종료)
  validate.ts             # YouTube URL 유효성 검사 + canonical videoId 추출 (extractVideoId)
  temp.ts                 # 요청별 job 디렉터리 생성/정리 + 고아 스위퍼 (sweepStaleJobs)
  thumbnail.ts            # 앨범아트 다운로드 (videoId 기반 URL 구성, 호스트 허용목록, 크기 상한)
instrumentation.ts        # 서버 기동 시 1회 실행 — temp/ 고아 잔여물 스위핑
```

## Architecture Decisions

- **spawn 사용**: shell injection 방지를 위해 exec 대신 spawn 사용
- **PATH 보강**: `lib/process.ts`에서 환경별 PATH 자동 추가 (Windows: WinGet 경로, Linux: ~/.deno/bin)
- **DB 없음**: 개인용이므로 다운로드 이력 미저장
- **임시 파일 — 요청별 job 디렉터리**: `temp/<uuid>/` 를 **yt-dlp 실행 전에** 생성하고, 성공(스트림 close)·실패(catch) 어느 쪽이든 디렉터리째 삭제. 디렉터리를 먼저 만드는 것이 핵심 — 이전 구조는 `inputPath`가 다운로드 성공 후에야 대입돼 실패 시 정리할 대상을 몰랐고, yt-dlp가 남긴 `.part`·프래그먼트가 영구히 쌓였다(실제로 서버에서 28MB 확인됨). `resolveDownloadedFile`은 `.part`를 제외하며, 파일이 없으면 `NoOutputFileError`를 던진다.
- **temp 스위퍼**: `instrumentation.ts`가 기동 시 1회, 다운로드 요청 시 기회적으로 6시간 초과 잔여물 삭제. 6시간 기준이라 진행 중인 긴 다운로드는 지워지지 않는다. 과거의 flat 파일 형태 고아도 함께 정리된다.
- **앨범아트 출처 고정 (SSRF 차단)**: 썸네일 URL은 **서버가 videoId로 직접 구성**한다(`maxresdefault` → `hqdefault` 폴백). 클라이언트가 보낸 URL은 받지 않는다 — 과거에는 요청 본문의 `thumbnail`을 검증 없이 `fetch`해 클라우드 메타데이터나 내부 포트로 요청을 보낼 수 있었다. 추가로 `i.ytimg.com` 허용목록, https 강제, 포트 거부, `redirect: "error"`(리다이렉트로 허용목록을 빠져나가지 못하게), 스트리밍 5MB 상한을 건다. 차단 시 `console.warn`으로 남겨, 허용목록이 좁아 앨범아트가 조용히 사라지는 일을 잡을 수 있다.
- **canonical videoId 파서**: `lib/validate.ts`의 `extractVideoId`가 `URL` 구조 파싱 + 11자 엄격 검증으로 ID를 뽑는다. 기존 정규식(`(?:v=|youtu\.be\/)([\w-]{11})`)은 `?xv=<11자>&v=<실제ID>` 에서 `xv=` 안의 `v=`를 먼저 잡아 **엉뚱한 ID로 캐시를 오염**시켰다. shorts/embed/live URL도 이제 캐시에 적중한다.
- **라이브·길이·용량 상한**: `downloadAudio`에 `--break-match-filters "!is_live & duration < 10800"` + `--max-filesize 500M`. `--match-filter`가 아니라 `--break-match-filters`인 이유는 전자가 **거부 시 exit 0에 파일만 없어서** 내부 오류로 둔갑하기 때문(후자는 exit 101). 라이브 URL은 `lib/validate.ts`가 `/live/`를 허용하므로 이 상한이 유일한 방어선이다.
- **거부 사유 메시지 매핑**: 의도적으로 거부하는 경로(필터·용량)는 사람이 읽을 수 있는 한국어로 바꿔 응답한다. 그 외에는 yt-dlp stderr를 그대로 노출한다. 주의 — yt-dlp는 `does not pass filter` 같은 사유를 **stdout**에 쓰므로 `CliError`가 stdout도 보관한다.
- **동시 실행 제한 (admission)**: `lib/admission.ts`가 풀을 **둘로 분리**해 관리한다 — download `capacity 1 / 대기 30초`, metadata `capacity 2 / 대기 10초`. 단일 FIFO로 묶으면 안 된다: 차트 요청이 수 분짜리 다운로드 뒤에 줄을 서는데 탐색 UI는 45초에 abort하므로(`explore-section.tsx`), CPU가 노는 동안 조회가 실패한다. 메타데이터 대기 10초는 그 45초보다 충분히 낮게 잡은 값이다. 적용 범위는 **yt-dlp를 실제로 띄우는 경로만** — search는 항상, info·charts는 캐시 미스만, charts의 `youtube-api` 소스는 googleapis 호출이라 제외. 대기 초과 시 JSON 503 + `Retry-After`(무한 큐는 또 다른 고갈 경로다). 다운로드는 **파일 생성까지만 슬롯을 쥐고 전송 전에 반납**한다 — 느린 클라이언트가 다음 추출을 막으면 안 된다.
- **admission 데드락 방지 (`maxHoldMs`)**: 반납이 누락된 경로가 하나라도 있으면 풀이 프로세스 수명 내내 잠겨 이후 모든 요청이 503이 된다. 슬롯은 `maxHoldMs` 초과 시 강제 해제되며 `console.error`로 남는다. 용량을 잠시 초과하는 편이 영구 데드락보다 낫다. **A(동시성 제한)와 B(데드라인)는 반드시 함께 가야 한다** — 데드라인 없는 세마포어는 작업이 한 번 멈추면 그대로 잠긴다.
- **작업 데드라인 + 프로세스 그룹 종료**: `runCli`에 `timeoutMs`를 두고 초과 시 `CliTimeoutError`. 종료는 `killTree`가 담당하는데, `child.kill()`이 직계 자식만 신호하기 때문이다 — yt-dlp는 JS 챌린지용 deno(115MB)와 HLS 먹싱용 ffmpeg를 띄우므로 고아로 남으면 1GB 박스의 메모리가 사라진다. Linux는 `detached`로 프로세스 그룹 리더를 만들어 그룹째 SIGTERM → 5초 후 SIGKILL, Windows는 `taskkill /T /F`로 분기한다(Windows에 `detached`를 주면 콘솔이 뜨므로 Linux 전용). 서버에서 손자 프로세스 3개가 전부 정리되는 것을 확인했다. 데드라인은 재시도 대상이 아니다 — `withRetry`는 429만 재시도한다.
- **서브프로세스 우선순위 양보 (WARP 보호)**: `runCli`이 spawn 직후 `os.setPriority(pid, 15)`로 우선순위를 낮춘다. yt-dlp는 로컬 WARP SOCKS5 프록시를 통해 YouTube에 닿는데, `warp-svc`가 같은 1 OCPU를 우리 작업과 나눠 쓰다 굶으면 프록시가 응답을 멈춘다. `nice` 접두사가 아니라 Node 내장 API를 쓴 이유는 Windows 로컬 개발에서도 동작해야 하기 때문이다. yt-dlp가 나중에 띄우는 deno는 자식이라 값을 상속한다(서버에서 둘 다 nice 15 확인). 경합이 없으면 nice 값과 무관하게 코어를 100% 받으므로 평소 속도 저하는 없다.
- **ID3 태그**: ffmpeg로 MP3/M4A/FLAC 변환 시 제목, 아티스트, 앨범아트 자동 삽입
- **하이브리드 차트**: PL 접두사 차트는 YouTube Data API v3, RDCLAK5uy_ 장르 플레이리스트는 yt-dlp로 분기 처리
- **서버 캐시**: 차트 데이터는 메모리 Map에 2시간 TTL로 캐시, 영상 info는 10분 TTL로 캐시 (DB 미사용)
- **429 재시도**: yt-dlp의 모든 호출에 exponential backoff 재시도 적용 (최대 2회, 3초→9초 간격, HTTP 429만 대상)
- **다운로드 메타데이터 전달**: 클라이언트가 info 조회 시 받은 title/channel을 다운로드 요청에 포함하여 서버 측 중복 info 호출 제거. **thumbnail은 전달하지 않는다** (위 SSRF 항목 참고)
- **미리듣기**: YouTube IFrame 임베드, 자동 재생 없음. 선택한 트랙 바로 아래 인라인(아코디언)으로 표시 — 재클릭/✕/ESC로 닫힘, 다른 트랙 선택 시 이동, 검색/카테고리 전환 시 자동 닫힘
- **결과 자동 스크롤**: 차트/검색에서 트랙 선택 시 상단 결과 카드로 부드럽게 스크롤(`scrollIntoView`), 미리듣기는 `block: "nearest"`로 필요할 때만 이동
- **진행률 2단계**: 서버 처리(추출·변환) 동안은 무한(indeterminate) 표시, 응답 수신 후 파일 전송 구간만 Content-Length 기반 정확한 % 표시 (가짜 타이머 미사용)
- **다운로드 완료 알림**: 저장 완료 시 파일명을 담은 성공 배너 노출(수동 ✕ 닫기 + 8초 자동 해제)
- **모션 접근성**: 스크롤·진행률 애니메이션은 `prefers-reduced-motion` 존중
- **테마**: CSS 변수 기반 라이트/다크 전환, `data-theme` 속성 + localStorage 저장, FOUC 방지 인라인 스크립트
- **반응형 트랙 버튼**: 모바일(< 640px) 아이콘 버튼, 데스크탑(≥ 640px) 텍스트 버튼

## Deployment

### 서버 정보
- **호스팅**: Oracle Cloud Free Tier (ap-chuncheon-1, South Korea North)
- **인스턴스**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **OS**: Ubuntu 24.04
- **도메인**: y2vmusic.duckdns.org (DuckDNS 무료 서브도메인)

### 서버 구성
- **nginx**: 리버스 프록시 (80/443 → 127.0.0.1:3000), `proxy_read_timeout 3600s`, `client_max_body_size 0`
- **certbot**: Let's Encrypt SSL 자동 갱신
- **PM2**: Next.js 프로세스 관리 (자동 재시작, 시스템 부팅 시 자동 실행)
  - `fork_mode` 1 인스턴스 — 인메모리 캐시(`chart-cache`, `info-cache`)가 프로세스 로컬이라 이 전제에 의존한다
  - 기동 명령: `pm2 start bash --name y2vmusic -- -c "npx next start --hostname 127.0.0.1 --port 3000"`
  - **`--hostname 127.0.0.1` 필수** — `0.0.0.0`으로 띄우면 nginx를 우회해 앱이 직접 노출된다
- **Swap**: 2GB swap 파일 (`/swapfile`, fstab 등록) — 빌드 시 OOM 방지
- **deno**: yt-dlp의 YouTube JS 챌린지 해독용 런타임 (~/.deno/bin)
- **Cloudflare WARP**: yt-dlp 프록시 (socks5://127.0.0.1:40000) — 클라우드 IP 봇 차단 우회
  - systemd drop-in `/etc/systemd/system/warp-svc.service.d/priority.conf` 로 `Nice=-10`, `CPUWeight=10000` 적용. 우리가 제어하지 않는 CPU 부하(`pnpm build` 등)로부터 데몬을 보호한다 (아래 "WARP CPU 기아" 참고)
- **yt-dlp config**: `~/.config/yt-dlp/config` — `--remote-components ejs:github`, `--proxy socks5://127.0.0.1:40000`
- **yt-dlp 설치**: pip 전역 (`/usr/local/lib/python3.12/dist-packages`). 업데이트: `sudo python3 -m pip install -U --break-system-packages yt-dlp`
- **환경 변수**: `.env.local` — `YOUTUBE_API_KEY` (YouTube Data API v3 차트 조회용)

### 네트워크 노출 (중요)
외부에 열린 포트는 **22 / 80 / 443 뿐**이다. 3000은 다음 두 겹으로 막혀 있다.

1. **iptables**: 3000 ACCEPT 규칙 삭제 후 `netfilter-persistent save`로 영구 저장
2. **바인딩**: Next가 `127.0.0.1:3000`에만 리스닝

두 방어선 모두 유지해야 한다. PM2 프로세스를 재생성할 때 `--hostname` 인자를 빠뜨리면 바인딩 방어선이 사라진다.

```bash
ss -tlnp | grep 3000                       # 127.0.0.1:3000 이어야 정상
sudo iptables -S INPUT | grep 3000          # 출력이 없어야 정상
curl -m 8 http://152.67.198.0:3000/         # 실패해야 정상
```

> **미완료**: Oracle Cloud 콘솔의 Security List에는 3000 Ingress 규칙이 아직 남아 있다(웹 콘솔에서만 삭제 가능). iptables가 막고 있어 실질 노출은 없지만, 정리하는 편이 좋다.

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
- Security List Ingress: 22(SSH), 80(HTTP), 443(HTTPS) — 3000 규칙은 불필요 (위 "네트워크 노출" 참고)
- OS iptables: 22/80/443 허용, REJECT 규칙 앞에 배치

## Conventions

- UI 언어: 한국어
- 라이트/다크 테마 (시스템 설정 감지 + 수동 토글, localStorage 저장)
- API 에러 응답: `{ "error": "메시지" }` 형식
- 포맷 옵션: MP3 (320/192/128), M4A (256/192/128), OPUS (원본), FLAC
- 플레이리스트 ID 관리: `lib/playlists.ts`에 집중 (ID 변경 시 이 파일만 수정)
- 추출 상한: 라이브 불가, 3시간(`MAX_DURATION_SECONDS`), 500MB(`MAX_FILESIZE`) — 값은 `lib/ytdlp.ts`에 집중
- 동시 실행·대기 상한: `lib/admission.ts` 하단의 두 풀 정의에 집중 (download / metadata)
- 작업 데드라인: 메타데이터 90초, 플레이리스트 120초, 다운로드 15분(`lib/ytdlp.ts`), 변환 15분(`lib/ffmpeg.ts`)
- 로그 접두사: `[temp]`, `[thumbnail]`, `[admission]`, `[deadline]` 처럼 대괄호 접두사를 쓴다 (`pm2 logs y2vmusic | grep '\[temp\]'`)

## Known Limitations

- **YouTube Music 전용 콘텐츠 미지원**: `music.youtube.com`에서만 재생 가능한 영상(YouTube Music Premium 전용)은 yt-dlp로 추출 불가. YouTube Music Premium 계정 쿠키 + `web_music` 클라이언트가 필요하며, 현재 지원하지 않음.
- **서버 OOM (해결됨)**: Oracle Cloud 1GB RAM 인스턴스에서 `pnpm build` 시 OOM이 발생했으나, 2GB swap 파일 추가로 해결. 빌드가 느려질 수는 있으나 서버가 죽지는 않음.
- **WARP CPU 기아 (해결됨)**: yt-dlp가 `[Errno 111] Connection refused` / `timed out`으로 자주 실패했다(다운로드 8회 중 4회). `warp-cli status`는 계속 `Connected`이고 터널 지표도 정상(지연 4ms, 손실 0.03%)이라 헷갈렸는데, **원인은 CPU 경합**이었다. 프로덕션에서 부하만 바꿔 측정:

  | 조건 | 프록시 실패 |
  |---|---|
  | CPU 유휴 | 0 / 15 |
  | CPU 포화 (nice 0) | 13 / 15 |
  | CPU 포화 (nice 19) | 0 / 15 |

  다운로드 경로만 실패했던 이유는 그 경로만 CPU를 포화시키기 때문이다 — yt-dlp의 JS 챌린지 해독(deno)과 ffmpeg 변환이 코어를 채우는 동안 같은 yt-dlp가 WARP을 통해 미디어를 받아야 한다. 해결: 서브프로세스 `os.setPriority` + `warp-svc` systemd 우선순위(둘 다 위 참고). 적용 후 연속 다운로드 **5/5 성공**(76~112초).

  진단 시 참고: `journalctl -u warp-svc | grep "hung daemon"` 의 워치독 경고는 2분마다 만성적으로 찍히지만 급성 실패와 무관했다(부하 실험 구간에서 0건). `Socks greeting failed ... UnexpectedEof` 는 불완전한 SOCKS 핸드셰이크(포트 스캔·TCP 연결 테스트)가 남기는 것이라 역시 무관하다.
- **인증 없음**: 공개 URL인데 `/api/download`가 누구에게나 열려 있다. nginx basic auth를 적용했다가 사용자 요청으로 되돌렸다(설정 백업: `/etc/nginx/sites-available/y2vmusic.bak.*`). 포트 3000 차단과 localhost 바인딩은 유지되므로 nginx 우회는 불가하고, 동시 실행 제한과 작업 데드라인이 자원 고갈은 막는다. 다만 요청 수 자체를 제한하지는 않으므로 링크를 널리 공유하지 않는 전제가 여전히 필요하다.
- **클라이언트 이탈 전파 없음**: `request.signal`을 `runCli`에 연결하지 않았다. 브라우저를 닫아도 진행 중인 yt-dlp/ffmpeg는 데드라인까지 계속 돈다(고아로 남지는 않는다 — 데드라인이 프로세스 그룹째 정리한다). 연결하면 CPU를 즉시 회수할 수 있지만, Next가 정상 스트리밍 완료 시에도 signal을 abort하는 경우가 있어 **정상 다운로드를 죽일 위험**이 있다. 이득 대비 위험이 애매해 미뤄둔 항목이다.
