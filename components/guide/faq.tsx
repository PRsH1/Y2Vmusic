"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "OPUS/FLAC는 왜 품질 선택이 없나요?",
    answer: "YouTube 원본 스트림을 그대로 추출하므로 별도 품질 설정이 불필요합니다.",
  },
  {
    question: "어떤 포맷을 선택해야 하나요?",
    answer: "일반 재생: MP3 / Apple 기기: M4A / 최소 용량: OPUS / 보관·편집: FLAC",
  },
  {
    question: "다운로드가 오래 걸려요",
    answer: "영상 길이에 비례합니다. 10분 영상 기준 약 15~30초 소요됩니다.",
  },
  {
    question: "모바일에서 파일이 안 보여요",
    answer: "iOS: Safari 우측 상단 다운로드 아이콘 확인. Android: 알림바 또는 Downloads 폴더.",
  },
  {
    question: "지원하는 URL 형식은?",
    answer: "youtube.com/watch, youtu.be 단축 링크, Shorts, 라이브(종료된 것) 모두 가능합니다.",
  },
  {
    question: "오류가 발생했어요",
    answer: "URL이 올바른지 확인 후 재시도하세요. 비공개/연령 제한 영상은 추출 불가합니다.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="grid gap-2">
      {FAQ_ITEMS.map((item, index) => {
        const open = openIndex === index;
        const panelId = `guide-faq-panel-${index}`;
        const buttonId = `guide-faq-button-${index}`;

        return (
          <div
            className="overflow-hidden rounded-md border border-[color:var(--border)] bg-[color:var(--surface)]"
            key={item.question}
          >
            <button
              aria-controls={panelId}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-raised)]"
              id={buttonId}
              onClick={() => setOpenIndex(open ? null : index)}
              type="button"
            >
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="text-base text-[color:var(--accent)]"
              >
                {open ? "-" : "+"}
              </span>
            </button>
            {open ? (
              <div
                aria-labelledby={buttonId}
                className="border-t border-[color:var(--border)] px-4 py-3 text-sm leading-6 text-[color:var(--muted)]"
                id={panelId}
                role="region"
              >
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
