"use client";

import { usePathname } from "next/navigation";
import { useCaiDat } from "@/lib/cai-dat-context";
import { useCallback, useEffect, useState } from "react";
import T from "./T";
import { useT } from "@/i18n/use-t";
import { HE_THONG_CUA_HANG } from "@/lib/theme";

/**
 * DOCK LIÊN HỆ — nhóm nút nổi ở góc phải dưới, có mặt trên mọi trang.
 *
 *   ┌───────────────────────────────┐
 *   │ bóng thoại gợi ý (1 lần/phiên)│   ← chỉ hiện sau vài giây, tắt được
 *   └───────────────────────────────┘
 *   [ ☎  Gọi ngay  0901 234 567 ]      ← nút nổi bật nhất: nền đỏ rượu + sóng lan
 *   [ ✦  Chat với AI            ]      ← mở khung chatbot (widget.js)
 *   (Zalo)                              ← tròn nhỏ
 *
 * Nguyên tắc (theo UI/UX Pro Max):
 *   · Chỉ MỘT phần tử chuyển động liên tục — vòng sóng của nút Gọi. Bóng gợi ý
 *     chỉ chạy một lần. Tất cả tắt hẳn khi khách chọn "giảm chuyển động".
 *   · Vùng chạm ≥ 48px, icon SVG (không emoji), có nhãn chữ cạnh icon, vòng focus rõ.
 *   · Không che nội dung quan trọng: lùi lên khi trang có thanh dính đáy
 *     (`[data-thanh-duoi]`), mờ đi khi có lớp phủ mở (`body.khoa-cuon`).
 *
 * Nút Chat điều khiển bong bóng CÓ SẴN của `widget.js` (backend giữ nguyên): bong bóng
 * gốc bị ẩn bằng CSS (globals.css) và nút này bấm hộ nó. Số điện thoại lấy từ
 * `hotline` (cấu hình cửa hàng Medusa) (hoặc hotline trong `cwwines-stores.json`); số Zalo từ
 * `zalo_phone`. Thiếu số thì bản chạy thử vẫn vẽ nút để duyệt bố cục,
 * còn production thì ẩn nút đó — một nút bấm không tới đâu còn tệ hơn không có nút.
 */

const KHOA_DA_XEM = "cwwines-goi-y-chat";
const CHO_HIEN_GOI_Y_MS = 6000;
const TU_TAT_GOI_Y_MS = 14000;

function soChu(s: string | undefined): string {
  return (s || "").replace(/[^\d+]/g, "");
}

function BieuTuong({ d, className = "h-[22px] w-[22px]", tay = false }: { d: string; className?: string; tay?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={tay ? "currentColor" : "none"}
      stroke={tay ? "none" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const D_DIEN_THOAI =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z";
const D_CHAT = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
const D_LAP_LANH = "M12 6.5l.95 2.2 2.2.95-2.2.95L12 12.8l-.95-2.2-2.2-.95 2.2-.95z";
const D_DONG = "M6 6l12 12M18 6 6 18";

const KHOANG_CHO_MO_CHAT_MS = 400;

/**
 * Điền câu hỏi vào ô chat của widget rồi bấm Gửi, như khách tự gõ.
 * Widget nằm trong iframe cùng origin (qua route /chatbot-widget) nên đọc được form.
 * Iframe có thể chưa tải xong: thử lại vài lần, quá lâu thì thôi.
 */
function guiCauHoi(cauHoi: string, lanThu = 0) {
  const doc = document.querySelector<HTMLIFrameElement>("#vph-chatbot-container iframe")?.contentDocument;
  const form = doc?.getElementById("chat-form") as HTMLFormElement | null | undefined;
  const input = doc?.getElementById("chat-input") as HTMLInputElement | null | undefined;
  if (doc?.readyState === "complete" && form && input) {
    input.value = cauHoi;
    form.requestSubmit();
    return;
  }
  if (lanThu < 25) window.setTimeout(() => guiCauHoi(cauHoi, lanThu + 1), 200);
}

export default function DockLienHe() {
  const t = useT();
  const caiDat = useCaiDat();
  const pathname = usePathname() ?? "";
  const thanhToan = pathname === "/thanh-toan" || pathname.startsWith("/thanh-toan/");

  const dienThoai = soChu(caiDat.hotline || HE_THONG_CUA_HANG.hotline);
  const hienThiSo = (caiDat.hotline || HE_THONG_CUA_HANG.hotline || "").trim();
  const zalo = soChu(caiDat.zalo_phone);
  // Chatbot có sẵn (widget.js đã được nhúng) hay chưa. Nút "Chat với AI" LUÔN được vẽ để khách
  // thấy shop có AI tư vấn; chưa có chatbot thì bấm sẽ hiện lời nhắn "sắp ra mắt".
  const chatSan = Boolean(caiDat.widget_key);
  const choXem = process.env.NODE_ENV !== "production";

  const [chatMo, setChatMo] = useState(false);
  const [goiY, setGoiY] = useState(false);
  const [chuaCoChat, setChuaCoChat] = useState(false);

  // Theo dõi khung chat của widget (được dựng sau khi widget.js tải xong).
  useEffect(() => {
    if (!chatSan) return;
    let quanSat: MutationObserver | undefined;
    const gan = () => {
      const khung = document.getElementById("vph-chatbot-container");
      if (!khung) return false;
      const dongBo = () => setChatMo(khung.classList.contains("open"));
      quanSat = new MutationObserver(dongBo);
      quanSat.observe(khung, { attributes: true, attributeFilter: ["class"] });
      dongBo();
      return true;
    };
    if (gan()) return () => quanSat?.disconnect();
    const timer = window.setInterval(() => gan() && window.clearInterval(timer), 400);
    const bo = window.setTimeout(() => window.clearInterval(timer), 30000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(bo);
      quanSat?.disconnect();
    };
  }, [chatSan]);

  // Bóng gợi ý: một lần mỗi phiên, sau vài giây, tự tắt. Không hiện ở trang thanh toán.
  useEffect(() => {
    if (!chatSan || thanhToan) return;
    let daXem = false;
    try {
      daXem = window.sessionStorage.getItem(KHOA_DA_XEM) === "1";
    } catch {
      /* chế độ riêng tư: coi như chưa xem */
    }
    if (daXem) return;
    const hien = window.setTimeout(() => setGoiY(true), CHO_HIEN_GOI_Y_MS);
    const tat = window.setTimeout(() => setGoiY(false), CHO_HIEN_GOI_Y_MS + TU_TAT_GOI_Y_MS);
    return () => {
      window.clearTimeout(hien);
      window.clearTimeout(tat);
    };
  }, [chatSan, thanhToan]);

  const danhDauDaXem = useCallback(() => {
    setGoiY(false);
    try {
      window.sessionStorage.setItem(KHOA_DA_XEM, "1");
    } catch {
      /* không lưu được thì thôi */
    }
  }, []);

  useEffect(() => {
    if (chatMo) danhDauDaXem();
  }, [chatMo, danhDauDaXem]);

  const batTatChat = useCallback(() => {
    danhDauDaXem();
    const nut = document.getElementById("vph-chatbot-launcher");
    if (!chatSan || !nut) {
      // Chưa nối chatbot: báo nhẹ nhàng thay vì để nút "chết".
      setChuaCoChat(true);
      window.setTimeout(() => setChuaCoChat(false), 4500);
      return;
    }
    nut.click();
  }, [chatSan, danhDauDaXem]);

  // Các nút khác trên trang (vd "Hỏi trợ lý AI" ở khối mời tư vấn) yêu cầu mở chat qua sự kiện này.
  // Nếu sự kiện kèm `cauHoi` thì gửi luôn câu đó vào ô chat, để bot trả lời đúng ngữ cảnh nút vừa bấm.
  useEffect(() => {
    const mo = (su: Event) => {
      const cauHoi = (su as CustomEvent<{ cauHoi?: string }>).detail?.cauHoi?.trim();
      const dangMo = document.getElementById("vph-chatbot-container")?.classList.contains("open");
      if (!dangMo) batTatChat();
      if (cauHoi && chatSan) {
        // Vừa mở thì chờ widget khởi tạo phiên trước, tránh tạo hai phiên cùng lúc.
        window.setTimeout(() => guiCauHoi(cauHoi), dangMo ? 0 : KHOANG_CHO_MO_CHAT_MS);
      }
    };
    window.addEventListener("cwwines:mo-chat-ai", mo);
    return () => window.removeEventListener("cwwines:mo-chat-ai", mo);
  }, [batTatChat, chatSan]);

  const veNutGoi = dienThoai || choXem;
  const veNutZalo = zalo || choXem;

  return (
    <div
      className="dock-lien-he fixed bottom-4 right-4 z-[999990] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      data-chat-mo={chatMo ? "" : undefined}
    >
      {/* Bóng gợi ý — một lần/phiên */}
      {chatSan && goiY && !chatMo && (
        <div
          role="status"
          className="vao-len relative max-w-[17rem] border border-copper bg-cream p-4 pr-9 shadow-mega sm:max-w-[19rem]"
        >
          <button
            type="button"
            onClick={danhDauDaXem}
            aria-label={t("dock.dismiss")}
            className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-ink-soft transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          >
            <BieuTuong d={D_DONG} className="h-[16px] w-[16px]" />
          </button>
          <p className="m-0 font-display text-[19px] leading-snug text-ink">
            <T k="dock.teaser_title" />
          </p>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            <T k="dock.teaser_body" />
          </p>
          <button
            type="button"
            onClick={batTatChat}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 bg-wine px-4 text-[12px] font-medium uppercase tracking-[0.14em] text-page transition-colors hover:bg-wine-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          >
            <T k="dock.teaser_cta" />
          </button>
          {/* Mũi tên chỉ xuống nút Chat */}
          <span
            aria-hidden="true"
            className="absolute -bottom-[7px] right-5 h-3 w-3 rotate-45 border-b border-r border-copper bg-cream"
          />
        </div>
      )}

      {chuaCoChat && (
        <div
          role="status"
          className="vao-len max-w-[16rem] border border-copper bg-cream p-3 text-[13px] leading-relaxed text-ink-muted shadow-mega"
        >
          <T k="dock.chat_soon" />
        </div>
      )}

      {/* Gọi ngay — icon tròn như Zalo; rê chuột/focus mới bung nhãn + số sang trái.
          Vòng sóng lan quanh nút là phần tử chuyển động liên tục DUY NHẤT của dock. */}
      {veNutGoi && (
        <a
          href={dienThoai ? `tel:${dienThoai}` : "#"}
          onClick={dienThoai ? undefined : (e) => e.preventDefault()}
          aria-label={dienThoai ? t("dock.call_aria", { so: hienThiSo || dienThoai }) : t("dock.call_unset")}
          title={dienThoai ? undefined : t("dock.call_unset")}
          className="dock-phu dock-song group relative isolate flex h-[48px] flex-row-reverse items-center rounded-full bg-wine text-page shadow-[0_6px_18px_rgba(107,30,46,0.45)] transition-colors duration-200 hover:bg-wine-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine motion-reduce:transition-none"
        >
          <span className="grid h-[48px] w-[48px] shrink-0 place-items-center">
            <BieuTuong d={D_DIEN_THOAI} className="h-[22px] w-[22px]" />
          </span>
          <span className="flex max-w-0 flex-col items-start overflow-hidden whitespace-nowrap leading-tight opacity-0 transition-[max-width,opacity,padding] duration-300 ease-cellar group-hover:max-w-[260px] group-hover:pl-5 group-hover:opacity-100 group-focus-visible:max-w-[260px] group-focus-visible:pl-5 group-focus-visible:opacity-100 motion-reduce:transition-none">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">
              <T k="dock.call_now" />
            </span>
            {hienThiSo && (
              <span className="text-[15px] font-medium tabular-nums tracking-wide">{hienThiSo}</span>
            )}
          </span>
        </a>
      )}

      {/* Zalo */}
      {veNutZalo && (
        <a
          href={zalo ? `https://zalo.me/${zalo}` : "#"}
          onClick={zalo ? undefined : (e) => e.preventDefault()}
          target={zalo ? "_blank" : undefined}
          rel="noopener noreferrer"
          aria-label={zalo ? t("dock.zalo_aria") : t("dock.zalo_unset")}
          title={zalo ? undefined : t("dock.zalo_unset")}
          className="dock-phu relative grid h-[48px] w-[48px] place-items-center rounded-full bg-[#0068FF] text-[12px] font-bold tracking-tight text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0068FF] motion-reduce:transition-none"
        >
          Zalo
        </a>
      )}

      {/* Chat với AI — icon tròn có hình con bot, giống Zalo/Gọi ngay; rê chuột/focus mới bung
          nhãn sang trái. Chấm xanh = đang trực tuyến. */}
      <button
        type="button"
        onClick={batTatChat}
        aria-expanded={chatMo}
        aria-label={chatMo ? t("dock.chat_close") : t("dock.chat_open")}
        className="dock-chat group relative flex h-[48px] flex-row-reverse items-center rounded-full border border-copper bg-ink text-page shadow-[0_6px_18px_rgba(28,26,25,0.4)] transition-[background-color,transform] duration-200 hover:bg-ink-strong active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper motion-reduce:transition-none"
      >
        <span className="relative grid h-[46px] w-[46px] shrink-0 place-items-center text-copper-light">
          {chatMo ? (
            <BieuTuong d={D_DONG} className="h-[20px] w-[20px]" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-[24px] w-[24px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* con bot: ăng-ten, đầu, hai mắt */}
              <path d="M12 7V4" />
              <circle cx="12" cy="3.2" r="1.2" fill="currentColor" stroke="none" />
              <rect x="4" y="7" width="16" height="12" rx="3.5" />
              <circle cx="9" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
              <path d="M9.5 16h5" />
              <path d="M2 12v3M22 12v3" />
            </svg>
          )}
          <span
            aria-hidden="true"
            className="absolute right-[3px] top-[3px] h-[11px] w-[11px] rounded-full border-2 border-ink bg-[#22C55E]"
          />
        </span>
        <span className="flex max-w-0 flex-col items-start overflow-hidden whitespace-nowrap leading-tight opacity-0 transition-[max-width,opacity,padding] duration-300 ease-cellar group-hover:max-w-[280px] group-hover:pl-5 group-hover:opacity-100 group-focus-visible:max-w-[280px] group-focus-visible:pl-5 group-focus-visible:opacity-100 motion-reduce:transition-none">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">
            {chatMo ? <T k="dock.chat_close_short" /> : <T k="dock.chat_ai" />}
          </span>
          {!chatMo && (
            <span className="text-[11px] tracking-wide text-page/70">
              <T k="dock.chat_sub" />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
