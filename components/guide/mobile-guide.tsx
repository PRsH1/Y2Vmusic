"use client";

import { OptionalTag } from "@/components/guide/pc-guide";

type GuideStep = {
  title: string;
  description: string;
  optional?: boolean;
};

const MOBILE_DIRECT_STEPS: GuideStep[] = [
  {
    title: "URL 복사",
    description: 'YouTube 앱에서 공유 → "링크 복사"를 탭하세요',
  },
  {
    title: "사이트 접속",
    description: "모바일 브라우저에서 Y2V Music에 접속하세요",
  },
  {
    title: "붙여넣기 & 검색",
    description: "맨 위 입력란을 탭 → 붙여넣기 → 검색 버튼 탭",
  },
  {
    title: "아티스트·제목 확인",
    description: "자동으로 채워진 아티스트·제목을 확인하세요. 파일명과 태그에 그대로 들어갑니다",
  },
  {
    title: "구간 자르기",
    optional: true,
    description: "'구간 자르기'를 켜고 시작·끝을 입력하세요 (예: 0:41). 비음악 구간 제안이 뜨면 [적용]을 탭하세요",
  },
  {
    title: "포맷 선택",
    description: "MP3를 추천합니다. 모든 기기에서 재생 가능하고, 선택은 다음에도 기억됩니다",
  },
  {
    title: "다운로드",
    description:
      "다운로드 버튼 탭 → 화면 하단 진행률 확인 → Android: 알림바 또는 Downloads 폴더 / iOS: Safari ↓ 아이콘 → 파일 앱",
  },
];

const MOBILE_EXPLORE_STEPS: GuideStep[] = [
  {
    title: "탐색",
    description: "아래 탐색 섹션에서 탭을 옆으로 밀어 고르거나 곡·아티스트를 검색하세요",
  },
  {
    title: "미리듣기",
    optional: true,
    description: "썸네일 또는 ▶ 아이콘을 탭하면 곡 바로 아래에서 재생됩니다",
  },
  {
    title: "곡 선택",
    description: "↓ 아이콘을 탭하면 곡 바로 아래에 다운로드 패널이 열립니다. '✓ 받음'은 이미 받은 곡입니다",
  },
  {
    title: "확인 & 설정",
    description:
      "아티스트·제목과 포맷을 확인하세요. 구간을 자를 때는 미리듣기로 들으면서 '미리듣기 위치를 시작으로 / 끝으로'를 탭하면 됩니다",
  },
  {
    title: "다운로드",
    description: "다운로드 버튼 탭 → Android: Downloads 폴더 / iOS: 파일 앱",
  },
];

function GuideMethod({
  title,
  steps,
}: {
  title: string;
  steps: GuideStep[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-bold text-[color:var(--text)]">{title}</h3>
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li
            className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
            key={`${title}-${step.title}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-bold text-[color:var(--accent-contrast)]">
              {index + 1}
            </span>
            <div className="grid gap-1">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[color:var(--text)]">
                {step.title}
                {step.optional ? <OptionalTag /> : null}
              </h4>
              <p className="text-sm leading-6 text-[color:var(--muted)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MobileGuide() {
  return (
    <div className="grid gap-6">
      <GuideMethod steps={MOBILE_DIRECT_STEPS} title="방법 A: URL 입력" />
      <GuideMethod steps={MOBILE_EXPLORE_STEPS} title="방법 B: 차트 / 검색으로 탐색" />
    </div>
  );
}
