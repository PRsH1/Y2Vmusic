# CLAUDE.md

## Project Overview

Y2V Music — YouTube 영상에서 최고 품질 오디오를 추출하는 개인용 웹앱.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm (via corepack)
- **External CLI**: yt-dlp, ffmpeg (system PATH required)

## Commands

```bash
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
- **PATH 보강**: `lib/process.ts`에서 WinGet 패키지 경로를 자동 추가 (Windows 환경)
- **DB 없음**: 개인용이므로 다운로드 이력 미저장
- **임시 파일**: UUID 기반 생성, 스트림 완료/에러 시 try/finally로 정리
- **ID3 태그**: ffmpeg로 MP3/M4A/FLAC 변환 시 제목, 아티스트, 앨범아트 자동 삽입

## Conventions

- UI 언어: 한국어
- 다크 테마 기본
- API 에러 응답: `{ "error": "메시지" }` 형식
- 포맷 옵션: MP3 (320/192/128), M4A (256/192/128), OPUS (원본), FLAC
