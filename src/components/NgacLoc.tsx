"use client";

import { useEffect, useState, type ReactNode } from "react";
import { khoaCuon } from "@/lib/khoa-cuon";
import T from "./T";

/**
 * Vỏ cho bộ lọc: nội dung (các liên kết lọc do máy chủ dựng) giữ NGUYÊN một bản
 * DOM duy nhất, chỉ đổi cách trình bày theo cỡ màn hình.
 *
 *   · Desktop (≥768px): nằm thẳng trong trang như trước.
 *   · Mobile: thu thành MỘT thanh gọn "Lọc & sắp xếp" dính dưới header; bấm vào thì
 *     bảng lọc trượt lên từ đáy màn hình. Nhờ vậy sản phẩm lên màn hình đầu thay
 *     vì bị khối lọc cao ~380px đẩy xuống.
 *
 * Các nút lọc vẫn là liên kết thật (xem ThanhLocDanhMuc) nên mỗi tổ hợp lọc vẫn
 * là một địa chỉ riêng. Bấm vào bất kỳ liên kết nào trong bảng thì bảng đóng lại.
 * Khi tắt JavaScript, thẻ <noscript> bên dưới trả bảng lọc về dạng nằm sẵn trong
 * trang để khách vẫn lọc được.
 */
export default function NgacLoc({
  soLoc,
  tong,
  tenSapXep,
  children,
}: {
  /** Số tiêu chí lọc đang bật (không tính sắp xếp). */
  soLoc: number;
  tong: number;
  /** Tên kiểu sắp xếp đang chọn, hiện ngay trên thanh. */
  tenSapXep: ReactNode;
  children: ReactNode;
}) {
  const [mo, setMo] = useState(false);

  // Mở bảng thì khoá cuộn nền; Esc để đóng.
  useEffect(() => {
    if (!mo) return;
    const mokhoa = khoaCuon();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      mokhoa();
    };
  }, [mo]);

  return (
    <div className="mb-8 md:mb-12">
      <noscript>
        <style>{".ngac-loc{position:static!important;transform:none!important;max-height:none!important}.ngac-loc-nen,.ngac-loc-thanh{display:none!important}"}</style>
      </noscript>

      {/* Thanh gọn — chỉ mobile */}
      <div className="ngac-loc-thanh sticky top-[76px] z-30 -mx-5 flex items-center gap-3 border-y border-line bg-page px-5 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setMo(true)}
          aria-haspopup="dialog"
          aria-expanded={mo}
          className="inline-flex min-h-[44px] items-center gap-2.5 border border-ink/25 bg-cream px-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-current" fill="none" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          <T k="filter.filter_sort" />
          {soLoc > 0 && (
            <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-wine px-1 text-[11px] font-medium tabular-nums text-page">
              {soLoc}
            </span>
          )}
        </button>
        <p className="m-0 min-w-0 flex-1 truncate text-right text-[12px] leading-tight text-ink-muted">
          <span className="block tabular-nums text-ink">{tong.toLocaleString("vi-VN")} <T k="common.products" /></span>
          <span className="block truncate">{tenSapXep}</span>
        </p>
      </div>

      {/* Nền mờ — chỉ khi bảng đang mở */}
      {mo && (
        <button
          type="button"
          aria-label="Đóng bộ lọc"
          onClick={() => setMo(false)}
          className="ngac-loc-nen fixed inset-0 z-[55] cursor-default bg-ink/45 md:hidden"
        />
      )}

      {/* Bảng lọc: trượt từ đáy trên mobile, nằm thẳng trong trang từ md trở lên */}
      <div
        role={mo ? "dialog" : undefined}
        aria-modal={mo || undefined}
        aria-label="Bộ lọc và sắp xếp"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setMo(false);
        }}
        className={`ngac-loc fixed inset-x-0 bottom-0 z-[56] flex max-h-[86vh] flex-col bg-page transition-transform duration-500 ease-cellar md:static md:z-auto md:max-h-none md:translate-y-0 md:border-t md:border-line md:bg-transparent md:transition-none ${
          mo ? "translate-y-0 shadow-mega" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 md:hidden">
          <h2 className="m-0 text-[24px] font-normal"><T k="filter.filter_sort" /></h2>
          <button
            type="button"
            onClick={() => setMo(false)}
            aria-label="Đóng"
            className="-mr-2 grid h-11 w-11 place-items-center text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] stroke-current" fill="none" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 md:overflow-visible md:px-0">{children}</div>

        <div className="shrink-0 border-t border-line px-5 py-3 md:hidden">
          <button type="button" onClick={() => setMo(false)} className="btn-wine w-full">
            <T k="filter.view_products" v={{ p1: tong.toLocaleString("vi-VN") }} />
          </button>
        </div>
      </div>
    </div>
  );
}
