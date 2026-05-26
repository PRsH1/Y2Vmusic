"use client";

type GuideStep = {
  title: string;
  description: string;
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
    description: "입력란을 탭 → 붙여넣기 → 검색 버튼 탭",
  },
  {
    title: "포맷 선택",
    description: "MP3를 추천합니다. 모든 기기에서 재생 가능합니다",
  },
  {
    title: "다운로드",
    description:
      "다운로드 버튼 탭 → Android: 알림바 또는 Downloads 폴더 / iOS: Safari ↓ 아이콘 → 파일 앱",
  },
];

const MOBILE_EXPLORE_STEPS: GuideStep[] = [
  {
    title: "탐색",
    description: "페이지 하단에서 카테고리를 스와이프하거나 검색어를 입력하세요",
  },
  {
    title: "곡 선택",
    description: "썸네일 탭으로 미리듣기, ↓ 아이콘 탭으로 곡 선택",
  },
  {
    title: "포맷 선택",
    description: "MP3를 추천합니다",
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
              <h4 className="text-sm font-bold text-[color:var(--text)]">
                {step.title}
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
