"use client";

import { useCallback, useState } from "react";
import T from "../T";
import SheetChonMa from "./SheetChonMa";
import { useT } from "@/i18n/use-t";
import { useGioHang } from "@/lib/gio-hang-context";
import { giaTriMa } from "@/lib/khuyen-mai-text";

/**
 * Ô "Mã giảm giá" ở giỏ hàng: viền đứt (gợi vé giảm giá), hiện mã đang dùng + giá trị, và nút
 * ĐỔI MÃ / CHỌN MÃ mở bảng chọn mã. Mã đã áp mà giỏ đổi làm nó hết đủ điều kiện thì báo rõ thay vì
 * im lặng (khách tưởng vẫn được giảm).
 */
export default function KhungMaGiamGia({ className = "" }: { className?: string }) {
  const t = useT();
  const { maGiamGia, uuDai } = useGioHang();
  const [mo, setMo] = useState(false);
  const dong = useCallback(() => setMo(false), []);

  const ap = uuDai.ma;
  const hopLe = ap?.hopLe === true;
  const khongConHopLe = Boolean(maGiamGia && ap && !ap.hopLe);

  return (
    <section aria-label={t("promo.code_title")} className={className}>
      <div className="flex items-center justify-between gap-2 border border-dashed border-[#B79B6E] bg-cream py-1 pl-3.5 pr-1.5">
        <div className="flex min-w-0 items-center gap-2.5 py-2">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-copper-ink"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6z" />
            <path d="M14 5v14" strokeDasharray="2 2" />
          </svg>
          <div className="min-w-0">
            {maGiamGia && ap ? (
              <>
                <p className="m-0 text-[14px] font-semibold tracking-[0.06em] text-ink">{ap.ma.ma}</p>
                {hopLe && (
                  <p className="m-0 text-[12px] text-ink-muted">
                    <T {...giaTriMaProps(ap)} />
                  </p>
                )}
              </>
            ) : (
              <p className="m-0 text-[13px] text-ink-muted">
                <T k="promo.code_pick" />
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMo(true)}
          aria-haspopup="dialog"
          className="min-h-[44px] shrink-0 whitespace-nowrap px-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink underline underline-offset-4 transition-colors hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine active:opacity-60"
        >
          {maGiamGia ? <T k="promo.code_change" /> : <T k="promo.code_choose" />}
        </button>
      </div>

      {khongConHopLe && (
        <p role="status" className="m-0 mt-2 text-[12px] leading-relaxed text-wine">
          <T k="promo.code_not_valid" v={{ ma: maGiamGia ?? "" }} />
        </p>
      )}

      <SheetChonMa mo={mo} dong={dong} />
    </section>
  );
}

function giaTriMaProps(ap: NonNullable<ReturnType<typeof useGioHang>["uuDai"]["ma"]>) {
  const g = giaTriMa(ap);
  return { k: g.k, v: g.v };
}
