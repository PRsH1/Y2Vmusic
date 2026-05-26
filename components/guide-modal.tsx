"use client";

import { useEffect, useState } from "react";
import { Faq } from "@/components/guide/faq";
import { MobileGuide } from "@/components/guide/mobile-guide";
import { PcGuide } from "@/components/guide/pc-guide";

type GuideModalProps = {
  open: boolean;
  onClose: () => void;
};

type GuideTab = "pc" | "mobile" | "faq";

const TABS: Array<{ id: GuideTab; label: string }> = [
  { id: "pc", label: "PC" },
  { id: "mobile", label: "모바일" },
  { id: "faq", label: "FAQ" },
];

export function GuideModal({ open, onClose }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>("pc");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex bg-[rgba(0,0,0,0.68)] sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        aria-labelledby="guide-modal-title"
        aria-modal="true"
        className="flex h-full w-full flex-col bg-[color:var(--surface-raised)] shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-[560px] sm:rounded-md sm:border sm:border-[color:var(--border)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4 sm:px-5">
          <div className="grid gap-1">
            <p className="text-xs font-bold text-[color:var(--accent)]">
              Y2V Music
            </p>
            <h2
              className="text-lg font-bold text-[color:var(--text)]"
              id="guide-modal-title"
            >
              사용법
            </h2>
          </div>
          <button
            aria-label="사용법 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-bold text-[color:var(--muted)] transition-colors hover:border-[color:var(--control-hover)] hover:text-[color:var(--text)]"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>

        <div className="border-b border-[color:var(--border)] px-4 pt-3 sm:px-5">
          <div
            aria-label="사용법 탭"
            className="grid grid-cols-3 gap-2"
            role="tablist"
          >
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  aria-controls={`guide-panel-${tab.id}`}
                  aria-selected={selected}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-bold transition-colors",
                    selected
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)] hover:border-[color:var(--control-hover)] hover:text-[color:var(--text)]",
                  ].join(" ")}
                  id={`guide-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div
            aria-labelledby={`guide-tab-${activeTab}`}
            id={`guide-panel-${activeTab}`}
            role="tabpanel"
          >
            {activeTab === "pc" ? <PcGuide /> : null}
            {activeTab === "mobile" ? <MobileGuide /> : null}
            {activeTab === "faq" ? <Faq /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
