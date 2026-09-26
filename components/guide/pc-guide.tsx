"use client";

type GuideStep = {
  title: string;
  description: React.ReactNode;
  /** Steps that can be skipped get a small tag so the flow still reads as short. */
  optional?: boolean;
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
        맨 위 입력란에 붙여넣기 <Kbd>Ctrl+V</Kbd> 후 검색 버튼을 클릭하세요
      </>
    ),
  },
  {
    title: "아티스트·제목 확인",
    description:
      "영상 제목에서 아티스트와 제목을 자동으로 채웁니다. 틀렸으면 고치세요 — 파일명(아티스트 - 제목)과 태그에 그대로 들어갑니다",
  },
  {
    title: "구간 자르기",
    optional: true,
    description:
      "앞뒤 인트로를 빼려면 '구간 자르기'를 켜고 시작·끝을 입력하세요 (예: 0:41). 뮤직비디오의 비음악 구간이 감지되면 [적용]으로 한 번에 채울 수 있습니다",
  },
  {
    title: "포맷 & 품질 선택",
    description: "원하는 오디오 포맷과 품질을 선택하세요. 다음 방문 때도 기억됩니다",
  },
  {
    title: "다운로드",
    description:
      "다운로드 버튼 클릭 → 화면 하단에 진행률이 표시되고, 완료되면 브라우저 다운로드 폴더에 저장됩니다",
  },
];

const PC_EXPLORE_STEPS: GuideStep[] = [
  {
    title: "탐색",
    description:
      "아래 탐색 섹션에서 탭(한국 주간 Top 100, K-Pop, 힙합 등)을 고르거나 곡·아티스트를 검색하세요",
  },
  {
    title: "미리듣기",
    optional: true,
    description:
      "썸네일이나 미리듣기 버튼을 클릭하면 곡 바로 아래에 플레이어가 열립니다. 다시 클릭하거나 ESC로 닫습니다",
  },
  {
    title: "곡 선택",
    description:
      "다운로드 버튼을 클릭하면 그 곡 바로 아래에 다운로드 패널이 열립니다. '✓ 받음' 표시는 이미 받은 곡입니다",
  },
  {
    title: "확인 & 설정",
    description:
      "아티스트·제목을 확인하고 포맷을 고르세요. 구간을 자를 때는 미리듣기로 들으면서 '미리듣기 위치를 시작으로 / 끝으로'를 누르면 그 시각이 입력됩니다",
  },
  {
    title: "다운로드",
    description:
      "다운로드 버튼 클릭 → 진행률은 화면 하단에 계속 표시되니 받는 동안 목록을 둘러봐도 됩니다",
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

export function OptionalTag() {
  return (
    <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[11px] font-normal text-[color:var(--muted)]">
      선택
    </span>
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
