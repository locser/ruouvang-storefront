"use client";

import T from "./T";
import { useT } from "@/i18n/use-t";
import { moChatAI } from "@/lib/chat-ai";

/**
 * Nút "Hỏi trợ lý AI" đặt trong các khối mời tư vấn ("Chưa biết chọn chai nào?").
 *
 * Mục đích kép: (1) mở khung chat với AI ngay tại đây; (2) CHO KHÁCH BIẾT shop có AI tư vấn,
 * và nó nằm ở nút Chat góc phải màn hình. Vì vậy:
 *   · mũi tên chỉ sang PHẢI, về phía dock liên hệ;
 *   · khi rê chuột/focus vào nút, nút "Chat với AI" thật trong dock được làm nổi bật
 *     (vòng đồng, thuộc tính `data-nhan-manh` — CSS ở globals.css), để khách thấy nó nằm đâu;
 *   · dòng chú thích bên dưới nói rõ vị trí đó.
 *
 * Chỉ mở khung chat khi nó đang đóng (khác nút trong dock vốn bật/tắt), để bấm lại không
 * vô tình đóng chat.
 */

function dock(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".dock-lien-he");
}

export default function NutHoiAI({ className = "" }: { className?: string }) {
  const t = useT();

  const nhanManh = () => dock()?.setAttribute("data-nhan-manh", "");
  const botNhanManh = () => dock()?.removeAttribute("data-nhan-manh");

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => {
          botNhanManh();
          moChatAI(t("cta.ask_ai_prompt"));
        }}
        onPointerEnter={nhanManh}
        onPointerLeave={botNhanManh}
        onFocus={nhanManh}
        onBlur={botNhanManh}
        aria-label={t("cta.ask_ai_aria")}
        className="group inline-flex min-h-[48px] items-center gap-3 border border-copper-light bg-transparent px-6 py-3 text-[12px] font-medium uppercase tracking-[0.16em] text-page transition-colors duration-300 hover:bg-copper-light hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-light active:opacity-80 motion-reduce:transition-none"
      >
        <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M12 6.5l.95 2.2 2.2.95-2.2.95L12 12.8l-.95-2.2-2.2-.95 2.2-.95z" fill="currentColor" stroke="none" />
        </svg>
        <T k="cta.ask_ai" />
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
