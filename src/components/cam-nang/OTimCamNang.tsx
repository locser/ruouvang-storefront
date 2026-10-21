"use client";

import { useT } from "@/i18n/use-t";

/**
 * Ô tìm trong Cẩm nang. Là form GET thường (`/blog?q=…`) nên chạy cả khi tắt
 * JavaScript, kết quả có đường dẫn chia sẻ được, và máy chủ lo việc lọc. Client
 * Component chỉ vì placeholder/aria-label cần đúng ngôn ngữ đang chọn (`useT`).
 */
export default function OTimCamNang({
  q,
  chuDe,
}: {
  q: string;
  /** Slug chủ đề đang chọn — giữ lại khi tìm để không mất bộ lọc. */
  chuDe?: string;
}) {
  const t = useT();

  return (
    <form action="/blog#bai-viet" method="get" role="search" className="mt-8 max-w-[460px]">
      <label htmlFor="cn-q" className="sr-only">
        {t("camnang.search_label")}
      </label>
      <div className="flex items-center gap-3 border-b border-ink transition-colors focus-within:border-wine focus-within:shadow-[0_1px_0_#6B1E2E]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="shrink-0 text-ink-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <input
          id="cn-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("camnang.search_placeholder")}
          autoComplete="off"
          enterKeyHint="search"
          className="h-[54px] min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:appearance-none"
        />
        {chuDe && <input type="hidden" name="chu-de" value={chuDe} />}
        <button
          type="submit"
          className="grid h-11 w-11 shrink-0 place-items-center text-wine transition-colors hover:text-wine-dark"
          aria-label={t("camnang.search_submit")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </form>
  );
}
