"use client";

type GuideStep = {
  title: string;
  description: string;
};

const MOBILE_STEPS: GuideStep[] = [
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
    description: "다운로드 버튼 탭 → 파일이 저장됩니다",
  },
  {
    title: "파일 확인",
    description: "Android: 알림바 또는 Downloads 폴더 / iOS: Safari ↓ 아이콘 → 파일 앱",
  },
];

export function MobileGuide() {
  return (
    <ol className="grid gap-3">
      {MOBILE_STEPS.map((step, index) => (
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
