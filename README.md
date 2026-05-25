# Y2V Music

YouTube 영상에서 최고 품질 오디오를 추출하는 개인용 웹앱.

## 주요 기능

- YouTube URL 입력 → 영상 정보 미리보기 (제목, 채널, 썸네일, 길이)
- 오디오 포맷 선택: MP3, M4A(AAC), OPUS(원본), FLAC
- 품질 선택: 최고 / 높음 / 보통
- YouTube 원본 스트림 품질 정보 표시
- ID3 태그 자동 삽입 (제목, 아티스트, 앨범아트)
- 다운로드 진행률 표시

## 선행 요구사항

| 도구 | 설치 방법 |
|------|----------|
| Node.js 24+ | [nodejs.org](https://nodejs.org) |
| pnpm | `corepack enable` |
| yt-dlp | `winget install yt-dlp.yt-dlp` |
| ffmpeg | `winget install Gyan.FFmpeg` |

## 설치 및 실행

```bash
# 의존성 설치
corepack pnpm install

# 개발 서버 실행
corepack pnpm dev
```

http://localhost:3000 에서 접속.

## 사용법

1. YouTube URL을 입력하고 검색 버튼 클릭
2. 영상 정보를 확인한 뒤 원하는 포맷과 품질 선택
3. 다운로드 버튼 클릭 → 파일 저장

## 기술 스택

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- yt-dlp (오디오 스트림 추출)
- ffmpeg (포맷 변환 + 메타데이터 삽입)

## 포맷별 품질

| 포맷 | 최고 | 높음 | 보통 | 비고 |
|------|------|------|------|------|
| MP3 | 320kbps | 192kbps | 128kbps | ID3v2.3 태그 + 앨범아트 |
| M4A | 256kbps | 192kbps | 128kbps | AAC 인코딩 + 앨범아트 |
| OPUS | 원본 | - | - | YouTube 원본 스트림 그대로 |
| FLAC | 원본 | - | - | 무손실 컨테이너 + 앨범아트 |

> YouTube 자체가 업로더의 원본을 재인코딩하므로, 추출 가능한 최대 품질은 YouTube가 제공하는 스트림의 상한(일반적으로 opus 160kbps)입니다.

## 라이선스

개인 사용 목적. 비공개.
