"use client";

type GuideStep = {
  title: string;
  description: React.ReactNode;
};

const PC_STEPS: GuideStep[] = [
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-1.5 py-0.5 text-[11px] font-bold text-[color:var(--text)]">
      {children}
    </kbd>
  );
}

export function PcGuide() {
  return (
    <ol className="grid gap-3">
      {PC_STEPS.map((step, index) => (
        <li
          className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3"
          key={step.title}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-bold text-[#07140d]">
            {index + 1}
          </span>
          <div className="grid gap-1">
            <h3 className="text-sm font-bold text-[color:var(--text)]">
              {step.title}
            </h3>
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
