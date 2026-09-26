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
corepack pnpm check:playlists  # 차트 ID 생존·이름 변경 확인 (YOUTUBE_API_KEY 필요)
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
    status/route.ts       # GET /api/status — 자기 다운로드가 대기 중인지 처리 중인지 조회
    segments/route.ts     # GET /api/segments — 구간 자르기 제안 (SponsorBlock)
components/               # UI 컴포넌트 (url-input, video-info, format-selector, download-button, progress-bar)
  download-panel.tsx        # 선택한 트랙 아래 인라인으로 열리는 다운로드 패널
  download-status-bar.tsx   # 화면 하단 고정 진행률·완료 알림
  download-history.tsx      # 최근 받은 곡 목록 (접힘, 다시 받기, 기록 지우기)
  metadata-fields.tsx       # 저장 전 아티스트·제목 수정 입력칸
  trim-controls.tsx         # 구간 자르기 (직접 입력, SponsorBlock 제안, 미리듣기 위치 찍기)
  guide-modal.tsx           # 사용법 모달 (탭 전환, 반응형, ESC/오버레이 닫기)
  preview-player.tsx        # YouTube IFrame 미리듣기 플레이어 (선택 트랙 바로 아래 인라인, ESC/✕ 닫기)
  guide/
    pc-guide.tsx            # PC 사용법 (방법 A: URL 입력 6단계 + 방법 B: 탐색 5단계, 건너뛸 수 있는 단계에 "선택" 표시)
    mobile-guide.tsx        # 모바일 사용법 (방법 A: URL 입력 7단계 + 방법 B: 탐색 5단계)
    faq.tsx                 # FAQ 아코디언 (15항목)
  explore/
    explore-section.tsx     # 탐색 섹션 컨테이너 (검색바 + 카테고리 + 트랙 리스트)
    search-bar.tsx          # 검색 입력 컴포넌트
    category-pills.tsx      # 카테고리 필 버튼 (가로 스크롤)
    track-list.tsx          # 트랙 리스트 + 더 보기 페이지네이션 + 인라인 미리듣기(활성 트랙 상태 관리, 트랙 변경 시 닫힘)
    track-item.tsx          # 트랙 아이템 (모바일: 아이콘 버튼, 데스크탑: 텍스트 버튼, 미리듣기 토글 aria-expanded)
lib/
  admission.ts           # 비싼 작업 동시 실행 제한 (download 1 / metadata 2, 대기 초과 시 503 + Retry-After)
  prefs.ts                # 포맷·품질 선택 기억 (localStorage)
  history.ts              # 다운로드 기록 (localStorage, 최신순 200개)
  metadata.ts             # 영상 제목에서 아티스트·제목 파싱 (채널은 대개 레이블이라)
  trim.ts                 # 구간 파싱·표시·검증 (클라이언트와 서버 공용)
  sponsorblock.ts         # 비음악 구간 조회 (music_offtopic, 해시 접두 조회, 1시간 캐시)
  preview-clock.ts        # 미리듣기 재생 위치 공유 저장소 (플레이어 → 패널)
  job-registry.ts         # 요청별 다운로드 상태(queued/running) — 대기 표시용
  ytdlp.ts               # yt-dlp CLI 래퍼 (getVideoInfo, downloadAudio, searchYouTube, fetchPlaylistFromYtDlp) + 429 재시도 + 라이브/길이/용량 상한
  youtube-api.ts          # YouTube Data API v3 래퍼 (fetchPlaylistFromApi)
  playlists.ts            # 플레이리스트 ID + kind(chart/mix) + 원본 이름
  chart-cache.ts          # 서버 캐시 — 차트 데이터 (TTL 2시간, 조회 실패 시 24시간까지 만료본 대체)
  info-cache.ts           # 서버 캐시 — 영상 info (Map 기반, TTL 10분)
  ffmpeg.ts               # ffmpeg CLI 래퍼 (convert, 메타데이터/앨범아트 삽입)
  process.ts              # child_process.spawn 래퍼 (PATH 보강, 우선순위 양보, 작업 데드라인, 프로세스 그룹 종료)
  validate.ts             # YouTube URL 유효성 검사 + canonical videoId 추출 (extractVideoId)
  temp.ts                 # 요청별 job 디렉터리 생성/정리 + 고아 스위퍼 (sweepStaleJobs)
  thumbnail.ts            # 앨범아트 다운로드 (videoId 기반 URL 구성, 호스트 허용목록, 크기 상한)
instrumentation.ts        # 서버 기동 시 1회 실행 — temp/ 고아 잔여물 스위핑
scripts/
  check-playlists.mjs     # 차트 ID 생존·이름 변경 확인 (수동 실행)
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
- **다운로드 UI는 누른 자리에, 상태는 항상 보이는 자리에**: 트랙을 고르면 `download-panel.tsx`가 **미리듣기와 같은 인라인 슬롯**에서 열린다. 예전에는 결과 카드가 페이지 최상단에 열려 사용자를 보던 목록에서 떼어놓았다 — 자동 스크롤이 동작하긴 했지만 그게 문제였고, 미리듣기는 인라인인데 다운로드만 순간이동하니 두 버튼의 동작이 비대칭이었다. 진행률과 완료 알림은 반대로 `download-status-bar.tsx`가 **화면 하단에 고정**한다. 추출에 1~2분이 걸려 그동안 목록을 계속 보기 때문이다. 패널은 render prop으로 `TrackList`에 내려보내 상태를 복제하지 않는다.
- **표기 정직성 (chart vs mix)**: `lib/playlists.ts`의 `kind`가 `"chart"`인 국가별 3개만 `#` 번호를 표시한다. 나머지 9개는 선곡 목록이라 번호가 **인기 순위가 아니라 목록 순서**일 뿐이다(`rank: index + 1`). 목록 위에 원본 이름과 수집 시각을 표시해 탭 라벨이 원본을 오해하게 만들지 않는다 — 예컨대 R&B 탭 원본은 `Korean R&B Hits 2024`라는 2024년 회고 모음이고, "오래된 곡이 반복된다"는 체감의 실제 원인이다. 근거: `docs/chart-audit-2026-09-26.md`.
- **차트 stale-while-error**: 원본 조회가 실패하면 24시간 이내의 만료 캐시로 대체한다. 주간 차트는 천천히 움직이고 WARP 프록시는 간헐적으로 흔들리므로, 두 시간 지난 목록이 에러 페이지보다 낫다. 대체된 응답은 `stale: true`로 표시되고 화면에도 "갱신 실패로 이전 목록 표시 중"이 뜬다. `cachedAt`은 **실제 수집 시각**이다(예전에는 캐시 적중 시에도 `new Date()`라 두 시간 된 목록이 방금 수집된 것처럼 보였다).
- **동시 실행 제한 (admission)**: `lib/admission.ts`가 풀을 **둘로 분리**해 관리한다 — download `capacity 1 / 대기 180초`, metadata `capacity 2 / 대기 10초`. 단일 FIFO로 묶으면 안 된다: 차트 요청이 수 분짜리 다운로드 뒤에 줄을 서는데 탐색 UI는 45초에 abort하므로(`explore-section.tsx`), CPU가 노는 동안 조회가 실패한다. 메타데이터 대기 10초는 그 45초보다 충분히 낮게 잡은 값이다. 적용 범위는 **yt-dlp를 실제로 띄우는 경로만** — search는 항상, info·charts는 캐시 미스만, charts의 `youtube-api` 소스는 googleapis 호출이라 제외. 대기 초과 시 JSON 503 + `Retry-After`(무한 큐는 또 다른 고갈 경로다). 다운로드는 **파일 생성까지만 슬롯을 쥐고 전송 전에 반납**한다 — 느린 클라이언트가 다음 추출을 막으면 안 된다.
- **대기 상한은 작업 시간보다 길어야 한다**: 처음에 다운로드 대기를 30초로 잡았는데, 실측 작업 시간이 76~112초라 **큐가 사실상 동작하지 않았다** — 두 번째 요청은 앞 작업의 마지막 30초 구간에 도착해야만 성공했고 대략 3분의 2가 503이었다. 180초로 올려 큐에서 기다렸다 완료되도록 했다(실측: 1번 49초 완료 → 2번 76초에 완료). 동시 실행을 2로 올리는 선택지는 버렸다 — 1코어를 나눠 쓰면 둘 다 느려지고 WARP 기아 위험이 돌아온다.
- **대기 상태 표시 (job-registry)**: 다운로드 응답은 단일 스트림이라 **처리 도중에 "당신은 대기 중"이라고 알려줄 수단이 없다.** 그래서 클라이언트가 `jobId`를 동봉하고 `/api/status`를 3초 간격으로 폴링한다. 집계 큐 수치로는 부족하다 — 슬롯 1개에 요청 2개면 `active/queued` 값이 양쪽에 동일해서 자기가 도는 중인지 기다리는 중인지 구분할 수 없다. `/api/status`는 서브프로세스도 admission 슬롯도 쓰지 않아 폴링이 본 작업과 경합하지 않는다. `jobId`는 요청 본문에서 오므로 UUID 형식 검증 + 200개 상한 + 1시간 TTL로 맵이 무한히 자라지 않게 한다. 진행바를 가짜로 움직이지 않는 기존 원칙과 같은 맥락이다.
- **admission 데드락 방지 (`maxHoldMs`)**: 반납이 누락된 경로가 하나라도 있으면 풀이 프로세스 수명 내내 잠겨 이후 모든 요청이 503이 된다. 슬롯은 `maxHoldMs` 초과 시 강제 해제되며 `console.error`로 남는다. 용량을 잠시 초과하는 편이 영구 데드락보다 낫다. **A(동시성 제한)와 B(데드라인)는 반드시 함께 가야 한다** — 데드라인 없는 세마포어는 작업이 한 번 멈추면 그대로 잠긴다.
- **작업 데드라인 + 프로세스 그룹 종료**: `runCli`에 `timeoutMs`를 두고 초과 시 `CliTimeoutError`. 종료는 `killTree`가 담당하는데, `child.kill()`이 직계 자식만 신호하기 때문이다 — yt-dlp는 JS 챌린지용 deno(115MB)와 HLS 먹싱용 ffmpeg를 띄우므로 고아로 남으면 1GB 박스의 메모리가 사라진다. Linux는 `detached`로 프로세스 그룹 리더를 만들어 그룹째 SIGTERM → 5초 후 SIGKILL, Windows는 `taskkill /T /F`로 분기한다(Windows에 `detached`를 주면 콘솔이 뜨므로 Linux 전용). 서버에서 손자 프로세스 3개가 전부 정리되는 것을 확인했다. 데드라인은 재시도 대상이 아니다 — `withRetry`는 429만 재시도한다.
- **서브프로세스 우선순위 양보 (WARP 보호)**: `runCli`이 spawn 직후 `os.setPriority(pid, 15)`로 우선순위를 낮춘다. yt-dlp는 로컬 WARP SOCKS5 프록시를 통해 YouTube에 닿는데, `warp-svc`가 같은 1 OCPU를 우리 작업과 나눠 쓰다 굶으면 프록시가 응답을 멈춘다. `nice` 접두사가 아니라 Node 내장 API를 쓴 이유는 Windows 로컬 개발에서도 동작해야 하기 때문이다. yt-dlp가 나중에 띄우는 deno는 자식이라 값을 상속한다(서버에서 둘 다 nice 15 확인). 경합이 없으면 nice 값과 무관하게 코어를 100% 받으므로 평소 속도 저하는 없다.
- **아티스트는 채널이 아니라 제목에서**: YouTube가 주는 건 업로드 채널이고, 음악 영상의 채널은 대개 레이블이다. 그대로 쓰면 ID3 아티스트가 "HYBE LABELS", "KQ ENTERTAINMENT", "이지금 [IU Official]"이 되고 제목엔 "Official MV"가 붙는다. `lib/metadata.ts`가 "아티스트 - 제목", 아티스트 '제목', `[MV]` 접두 같은 흔한 형태를 읽고 포장 문구를 걷는다. 추측이므로 **저장 전에 고칠 수 있게** 입력칸을 둔다. 파일명은 "아티스트 - 제목". 클라이언트가 값을 안 보낸 요청에도 서버가 같은 파싱을 적용한다.
- **정사각형 앨범아트**: 썸네일(maxresdefault)은 1280×720인데 음악 앱은 커버를 정사각형으로 보여준다. 짧은 변 기준 중앙 크롭(`COVER_ART_ARGS`, `min(iw,ih)`라 세로형도 됨).
- **구간 자르기**: 모든 곡에서 쓰는 선택 기능(기본 꺼짐). MV인지 음원인지 코드로 믿을 만하게 구분할 수 없어 대상을 제한하지 않는다. 지정은 세 가지 — 직접 입력, SponsorBlock `music_offtopic`(MV 비음악 구간 전용 카테고리) 제안, 미리듣기 재생 위치 찍기. **제안은 [적용]으로만 채우고 자동 적용하지 않는다** — 커뮤니티 데이터라 가끔 틀리고, 조용히 틀리게 자르면 실제 음악이 사라져도 알아채기 어렵다. 1초 미만 구간은 제안하지 않는다(운영 데이터에 0.27초짜리 "인트로" 태그가 있었다). 곡 중간 구간은 보고만 하고 자르지 않는다. SponsorBlock은 해시 접두 4자리로 조회해 영상 ID를 보내지 않는다. 차트 상위 25곡 중 8곡에 데이터가 있었다.
- **자르기 방식이 포맷마다 다른 이유**: 재인코딩 포맷(MP3·M4A·FLAC)은 `-ss`/`-to`를 **`-i` 앞**(입력 쪽)에 둔다 — 버릴 구간을 디코딩하지 않아 빠르고 정확하다. OPUS는 스트림 복사라 **`-i` 뒤**(출력 쪽)에 둔다. 스트림 복사에서 입력 쪽 탐색은 직전 WebM 클러스터로 맞춰져 **1.1초 길게** 잘렸다(기대 151.34초 → 152.46초). 출력 쪽은 151.365초(오차 25ms). 잘린 끝에만 0.5초 페이드아웃(실측: 마지막 0.4초 −46 dB, 직전 −14 dB). 잘린 앞은 페이드인하지 않는다 — 곡 도입이 흐려진다. OPUS는 디코딩하지 않으니 페이드가 없다.
- **미리듣기 위치**: 임베드를 `enablejsapi=1`로 열고 `{event:"listening"}`을 보내면 `infoDelivery`로 `currentTime`이 온다. **이 iframe의 contentWindow에서 온 메시지만 믿는다**(아무 페이지나 이 창에 postMessage를 보낼 수 있다). 플레이어와 패널은 부모가 달라 `lib/preview-clock.ts`로 잇고, 미리듣기를 닫아도 마지막 위치가 남아 "듣고 닫고 찍기"가 된다.
- **다운로드 기록**: localStorage에 최신순 200개. 차트의 "✓ 받음" 배지와 패널의 "이미 받은 곡" 안내로 실수 중복을 막는다(한 곡에 1~2분). 저장값은 사용자가 편집할 수 있으므로 형식이 틀린 항목은 읽을 때 버린다.
- **ID3 태그**: ffmpeg로 MP3/M4A/FLAC 변환 시 제목, 아티스트, 앨범아트 자동 삽입 (아티스트·제목은 위 파싱 결과)
- **하이브리드 차트**: PL 접두사 차트는 YouTube Data API v3, RDCLAK5uy_ 장르 플레이리스트는 yt-dlp로 분기 처리
- **서버 캐시**: 차트 데이터는 메모리 Map에 2시간 TTL로 캐시, 영상 info는 10분 TTL로 캐시 (DB 미사용)
- **429 재시도**: yt-dlp의 모든 호출에 exponential backoff 재시도 적용 (최대 2회, 3초→9초 간격, HTTP 429만 대상)
- **다운로드 메타데이터 전달**: 클라이언트가 info 조회 시 받은 title/channel을 다운로드 요청에 포함하여 서버 측 중복 info 호출 제거. **thumbnail은 전달하지 않는다** (위 SSRF 항목 참고)
- **미리듣기**: YouTube IFrame 임베드, 자동 재생 없음. 선택한 트랙 바로 아래 인라인(아코디언)으로 표시 — 재클릭/✕/ESC로 닫힘, 다른 트랙 선택 시 이동, 검색/카테고리 전환 시 자동 닫힘
- **결과 자동 스크롤**: URL 입력·"다시 받기"로 연 곡은 상단 결과 카드로 부드럽게 스크롤(`scrollIntoView`). 차트/검색에서 고른 곡의 인라인 패널과 미리듣기는 `block: "nearest"`로 필요할 때만 이동
- **사용법 문서는 기능과 함께 고친다**: 인라인 패널·이름 수정·구간 자르기·대기 표시가 들어가는 동안 모달이 "상단 결과 카드로 이동", "10분 영상 15~30초" 같은 구 버전 설명을 그대로 보여주고 있었다. 사용자에게 보이는 흐름을 바꾸면 `components/guide/`와 README "사용법"도 같이 수정한다
- **실제 진행률 (단계별)**: yt-dlp는 `--newline --progress-template`로 "받은 바이트/전체" 줄을 stdout에 내보내고(파이프여도 나온다, 조각 스트림은 전체가 NA라 추정치로 나눔), ffmpeg는 `-progress pipe:1`의 `out_time_us`를 곡 길이로 나눈다. 둘 다 `runCli`의 `onStdout`으로 읽어 job-registry의 `phase`/`percent`에 담고 `/api/status`(1.5초 폴링)로 보여준다. 화면은 "YouTube에서 준비 중…"(무한) → "YouTube에서 받는 중 N%" → "MP3로 변환 중 N%" → 파일 전송 %. **단계마다 0~100을 따로 쓴다** — 다운로드와 변환을 한 합계로 섞으려면 비중을 지어내야 하고, 이 앱은 진행률을 꾸며내지 않는다(가짜 타이머 미사용). 곡 길이를 모르면 변환도 무한으로 둔다. 실측(서버, 3분 곡): 준비 약 19초(측정 불가 구간 — deno 챌린지 해독), 받기 2초, 변환 32초.
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
- 플레이리스트 ID 관리: `lib/playlists.ts`에 집중 (ID 변경 시 이 파일만 수정). 새 탭 추가 시 `kind`를 정확히 골라야 한다 — 순위가 아닌 목록에 `chart`를 주면 화면이 거짓말을 한다
- 추출 상한: 라이브 불가, 3시간(`MAX_DURATION_SECONDS`), 500MB(`MAX_FILESIZE`) — 값은 `lib/ytdlp.ts`에 집중
- 동시 실행·대기 상한: `lib/admission.ts` 하단의 두 풀 정의에 집중 (download 1개·대기 180초 / metadata 2개·대기 10초)
- 작업 데드라인: 메타데이터 90초, 플레이리스트 120초, 다운로드 15분(`lib/ytdlp.ts`), 변환 15분(`lib/ffmpeg.ts`)
- 로그 접두사: `[temp]`, `[thumbnail]`, `[admission]`, `[deadline]`, `[charts]` 처럼 대괄호 접두사를 쓴다 (`pm2 logs y2vmusic | grep '\[temp\]'`)

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

## 차트 원본 선정 (2026-09-26 교체)

감사 이후 R&B와 인디 원본을 교체했다. 다음에 원본을 고를 때 알아둘 것.

- **Data API 검색에서 YouTube Music 공식 플레이리스트는 `channelTitle`이 비어 있다.** 채널명으로 거르면 0건이 나온다. **ID 접두사 `RDCLAK`로 걸러야** 찾힌다. 이걸 몰라 한참 돌아갔다.
- **`playlists.list`는 자동 생성 플레이리스트 조회가 들쭉날쭉하다.** 살아있는 RDCLAK ID 3개 중 1개만 반환하고 2개는 없다고 답했다. 생존 판정은 `playlistItems`로 해야 한다(셋 다 정상 응답).
- **"최근 갱신"을 첫 항목의 `publishedAt`으로 판단하면 안 된다.** RDCLAK 목록은 큐레이션 순서라 첫 항목이 최신이 아니다. 전체 항목을 훑어 최대값을 봐야 한다. 이 차이로 `Cafe Korean Indie Music`을 2024-02-29로 잘못 읽을 뻔했다(실제 2026-09-18).
- 교체 근거: R&B는 `Korean R&B Hits 2024`(최신 추가 2025-12-30, 연도 고정) → `Chill Korean Hip-Hop/R&B`(2026-09-04, 힙합 탭과 90곡 중 2곡만 중복). 인디는 `Seoul Cafe`(설명부터 "K-pop folk and ballads", 실제로 화사·ROSÉ·BLACKPINK) → `Cafe Korean Indie Music`(2026-09-18, wave to earth·한로로 등 실제 인디).

## 미반영 감사 권고

`docs/chart-audit-2026-09-26.md`의 권고 중 판단이 필요해 남겨둔 것.

- **`RDCLAK5uy_` ID의 수명**: YouTube Music이 자동 생성하는 믹스 ID라 예고 없이 사라지거나 조용히 다른 성격으로 바뀔 수 있다. 사라지면 해당 탭이 오류가 된다(만료 캐시로 24시간은 버틴다). `pnpm check:playlists`로 확인하되 **자동 실행은 없다** — 정기적으로 돌리는 것은 사람 몫이다.
- **곡 수 상한 비대칭**: `lib/youtube-api.ts`는 100곡에서 자르고(`while (tracks.length < 100)`) yt-dlp 소스는 자르지 않는다. 그래서 OST는 135곡, 트로트는 103곡이 나온다. 의도된 것인지 확인되지 않았다.
- **검색 결과 20개 고정**: `ytsearch20:`이고 "더 보기"가 없다. 사용자 요청으로 보류.

# use mcp

## 필요할때 다음 mcp 를 호출할 것
context7
brave-search
filesystem
github
tavily
