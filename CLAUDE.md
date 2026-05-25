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
  layout.tsx              # 루트 레이아웃 (다크 테마, 한국어)
  page.tsx                # 메인 단일 페이지 (클라이언트 컴포넌트)
  globals.css             # CSS 변수 + Tailwind
  api/
    info/route.ts         # POST /api/info — 영상 정보 조회
    download/route.ts     # POST /api/download — 오디오 추출 및 다운로드
components/               # UI 컴포넌트 (url-input, video-info, format-selector, download-button, progress-bar)
lib/
  ytdlp.ts               # yt-dlp CLI 래퍼 (getVideoInfo, downloadAudio)
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
- **yt-dlp config**: `~/.config/yt-dlp/config` — `--remote-components ejs:github`, `--cookies /home/ubuntu/cookies.txt`

### YouTube 쿠키 관리
- YouTube가 클라우드 IP를 봇으로 차단하므로 브라우저 쿠키가 필요
- 쿠키 파일 위치: `/home/ubuntu/cookies.txt` (Netscape 형식)
- 쿠키 만료 시 재업로드 필요:
```bash
scp -i D:/sshkey/ssh-key-2026-05-25.key <새_쿠키파일> ubuntu@152.67.198.0:~/cookies.txt
```

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
- 다크 테마 기본
- API 에러 응답: `{ "error": "메시지" }` 형식
- 포맷 옵션: MP3 (320/192/128), M4A (256/192/128), OPUS (원본), FLAC
