"use client";

type CategoryPillsProps = {
  items: Array<{ id: string; label: string }>;
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function CategoryPills({
  items,
  activeId,
  onSelect,
}: CategoryPillsProps) {
  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto">
      {items.map((item) => {
        const selected = activeId === item.id;

        return (
          <button
            aria-pressed={selected}
            className={[
              "flex-shrink-0 cursor-pointer whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors hover:border-[#586164] hover:text-[color:var(--text)]",
              selected
                ? "border-[color:var(--accent)] bg-[rgba(57,217,138,0.12)] font-bold text-[color:var(--text)]"
                : "border-[#3f4648] bg-[color:var(--surface)] text-[color:var(--muted)]",
            ].join(" ")}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
