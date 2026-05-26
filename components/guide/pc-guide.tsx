"use client";

type GuideStep = {
  title: string;
  description: React.ReactNode;
};

const PC_DIRECT_STEPS: GuideStep[] = [
  {
    title: "URL 복사",
    description: (
      <>
        YouTube에서 원하는 영상의 주소를 복사하세요 <Kbd>Ctrl+C</Kbd>
      </>
    ),
  },
  {
    title: "붙여넣기 & 검색",
    description: (
      <>
        입력란에 붙여넣기 <Kbd>Ctrl+V</Kbd> 후 검색 버튼을 클릭하세요
      </>
    ),
  },
  {
    title: "영상 확인",
    description: "제목, 채널, 길이 정보가 맞는지 확인하세요",
  },
  {
    title: "포맷 & 품질 선택",
    description: "원하는 오디오 포맷과 품질을 선택하세요",
  },
  {
    title: "다운로드",
    description: "다운로드 버튼 클릭 → 완료 후 브라우저 다운로드 폴더에 저장됩니다",
  },
];

const PC_EXPLORE_STEPS: GuideStep[] = [
  {
    title: "탐색",
    description:
      "페이지 하단의 탐색 섹션에서 차트(한국 Top 100, K-Pop 등)를 선택하거나 검색어를 입력하세요",
  },
  {
    title: "곡 선택",
    description:
      "썸네일을 클릭하면 미리듣기, 다운로드 버튼을 클릭하면 곡이 선택됩니다",
  },
  {
    title: "포맷 & 품질 선택",
    description: "원하는 오디오 포맷과 품질을 선택하세요",
  },
  {
    title: "다운로드",
    description: "다운로드 버튼 클릭 → 완료 후 브라우저 다운로드 폴더에 저장됩니다",
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-1.5 py-0.5 text-[11px] font-bold text-[color:var(--text)]">
      {children}
    </kbd>
  );
}

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

export function PcGuide() {
  return (
    <div className="grid gap-6">
      <GuideMethod steps={PC_DIRECT_STEPS} title="방법 A: URL 직접 입력" />
      <GuideMethod steps={PC_EXPLORE_STEPS} title="방법 B: 차트 / 검색으로 탐색" />
    </div>
  );
}
