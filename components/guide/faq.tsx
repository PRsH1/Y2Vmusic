"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "어떤 포맷을 선택해야 하나요?",
    answer:
      "일반 재생: MP3 / Apple 기기: M4A / 최소 용량·무변환: OPUS. FLAC은 편집용 무손실 파일이 꼭 필요할 때만 고르세요 — YouTube 원본이 이미 손실 압축이라 음질은 그대로이고 용량만 커집니다.",
  },
  {
    question: "OPUS/FLAC는 왜 품질 선택이 없나요?",
    answer:
      "OPUS는 YouTube 원본 스트림을 변환 없이 그대로 받고, FLAC은 무손실이라 비트레이트 설정이 없습니다.",
  },
  {
    question: "다운로드가 오래 걸려요",
    answer:
      "서버가 작아 3분 곡 기준 1~2분쯤 걸립니다. 처음 \"YouTube에서 준비 중…\" 구간(약 20초)은 진행률을 잴 수 없어 막대만 움직이고, 이후 \"받는 중 N%\" → \"변환 중 N%\"로 실제 진행률이 표시됩니다. 구간을 자르면 변환이 짧아집니다.",
  },
  {
    question: "\"대기 중\"이라고 떠요",
    answer:
      "서버는 한 번에 한 곡만 처리합니다. 다른 다운로드가 진행 중이면 차례를 기다렸다가 자동으로 시작하니 그대로 두세요. 3분 넘게 차례가 오지 않으면 \"잠시 후 다시 시도하세요\" 안내가 뜹니다.",
  },
  {
    question: "아티스트·제목이 이상하게 채워졌어요",
    answer:
      "YouTube 채널은 대개 소속사 이름이라 영상 제목에서 아티스트와 제목을 추측해 채웁니다. 추측이 틀릴 수 있으니 다운로드 전에 입력칸에서 고치세요. 파일명과 태그에 그대로 반영됩니다.",
  },
  {
    question: "구간 자르기는 어떻게 쓰나요?",
    answer:
      "'구간 자르기'를 켜고 시작·끝을 1:23 형식으로 입력합니다. 비워 두면 처음부터 / 끝까지입니다. 잘린 끝에는 0.5초 페이드아웃이 들어갑니다(OPUS는 변환하지 않아 제외). 곡 중간의 한 구간만 빼는 기능은 없습니다.",
  },
  {
    question: "\"비음악 구간이 감지됐습니다\"는 무엇인가요?",
    answer:
      "뮤직비디오 앞뒤의 드라마·인트로 같은 부분을 SponsorBlock 공개 데이터에서 찾아 알려주는 것입니다. 사람들이 표시한 데이터라 가끔 틀리므로 자동으로 자르지 않습니다. [적용]을 눌러 시각을 확인한 뒤 받으세요. 데이터가 없는 곡이 많아 안내가 뜨지 않는 경우가 더 흔합니다.",
  },
  {
    question: "'미리듣기 위치를 시작으로' 버튼이 눌리지 않아요",
    answer:
      "탐색 목록에서 그 곡의 미리듣기를 한 번 재생해야 켜집니다. 원하는 지점에서 일시정지하고 누르세요. 미리듣기를 닫아도 마지막 위치는 남습니다. URL로 연 곡에는 미리듣기가 없으니 시각을 직접 입력하세요.",
  },
  {
    question: "'✓ 받음' 표시와 '최근 받은 곡'은 어디에 저장되나요?",
    answer:
      "이 브라우저에만 저장됩니다(최근 200곡). 서버에는 남지 않아 다른 기기나 브라우저에서는 보이지 않습니다. '최근 받은 곡'에서 다시 받거나 기록을 지울 수 있습니다.",
  },
  {
    question: "장르 탭에는 왜 순위 번호가 없나요?",
    answer:
      "순위가 있는 것은 한국·글로벌·일본 주간 Top 100뿐입니다. 장르 탭은 YouTube Music의 선곡 목록이라 순서가 인기 순위가 아닙니다. 목록 위에 원본 이름과 수집 시각이 표시됩니다.",
  },
  {
    question: "차트는 얼마나 자주 업데이트되나요?",
    answer:
      "2시간마다 새로 가져옵니다. 갱신에 실패하면 에러 대신 이전 목록을 보여주고 \"갱신 실패로 이전 목록 표시 중\"이라고 알려줍니다.",
  },
  {
    question: "모바일에서 파일이 안 보여요",
    answer: "iOS: Safari 우측 상단 다운로드 아이콘 → 파일 앱. Android: 알림바 또는 Downloads 폴더.",
  },
  {
    question: "지원하는 URL 형식은?",
    answer:
      "youtube.com/watch, youtu.be 단축 링크, Shorts, 끝난 라이브 다시보기가 가능합니다. 진행 중인 라이브, 3시간 넘는 영상, 500MB 넘는 파일은 받을 수 없습니다.",
  },
  {
    question: "오류가 발생했어요",
    answer:
      "URL이 올바른지 확인 후 다시 시도하세요. 비공개·연령 제한 영상과 YouTube Music에서만 재생되는 곡(Premium 전용)은 추출할 수 없습니다.",
  },
  {
    question: "미리듣기는 데이터를 사용하나요?",
    answer:
      "네, 미리듣기는 YouTube 영상을 임베드로 재생하므로 스트리밍 데이터가 사용됩니다. 다운로드에는 영향을 주지 않습니다.",
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
