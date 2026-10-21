"use client";

import { useMemo } from "react";
import T from "../T";
import { useT } from "@/i18n/use-t";
import { useGioHang } from "@/lib/gio-hang-context";
import { CHINH_SACH, tinhThung } from "@/lib/khuyen-mai";
import { tienSong } from "@/lib/tien";

/**
 * "Ưu đãi đang mở khoá" — khối đầu giỏ hàng (theo bản thiết kế "Giỏ hàng có khuyến mãi").
 *
 * Hai thanh tiến độ, đọc từ cùng bộ máy khuyến mãi với tổng đơn:
 *   1. THÙNG 6 CHAI: 6 ô, mỗi chai một ô; còn thiếu N chai thì nói rõ và ước tính số tiền sẽ
 *      tiết kiệm thêm (`giaChaiGoiY` là giá chai đang gợi ý bên dưới).
 *   2. MIỄN PHÍ GIAO HÀNG: đã đủ thì báo ✓; chưa thì nói còn thiếu bao nhiêu.
 *
 * Mobile-first: một cột, chữ ≥ 13px, thanh dày 6px. Có `role="progressbar"` để đọc được bằng
 * trình đọc màn hình (màu không phải kênh duy nhất — luôn có chữ "5/6" kèm theo).
 */
export default function TienDoUuDai({ giaChaiGoiY }: { giaChaiGoiY?: number }) {
  const t = useT();
  const { danhSach, uuDai } = useGioHang();
  const thung = useMemo(() => tinhThung(danhSach, giaChaiGoiY), [danhSach, giaChaiGoiY]);

  if (uuDai.tamTinh <= 0) return null;

  const box = CHINH_SACH.chaiMoiThung;
  const daDu = thung.soChai > 0 && thung.chaiConThieu === 0;
  const dang = thung.chaiConThieu === 0 ? box : box - thung.chaiConThieu;
  const phanTramGiao = Math.min(100, Math.round((uuDai.tamTinhSauThung / CHINH_SACH.nguongMienPhiGiaoVnd) * 100));

  return (
    <section
      aria-label={t("promo.region")}
      className="mb-8 flex flex-col gap-4 border border-line bg-cream p-4 sm:p-5"
    >
      {thung.soChai > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="m-0 text-[14px] leading-snug text-ink">
              {daDu ? (
                <T k="promo.case_unlocked" v={{ box, pct: CHINH_SACH.phanTramThung }} />
              ) : (
                <T k="promo.add_n_more" v={{ n: thung.chaiConThieu, box, pct: CHINH_SACH.phanTramThung }} />
              )}
            </p>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-wine">
              {dang}/{box}
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={box}
            aria-valuenow={dang}
            aria-valuetext={`${dang}/${box}`}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${box}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: box }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 transition-colors duration-300 motion-reduce:transition-none ${
                  i < dang ? "bg-wine" : "bg-line"
                }`}
              />
            ))}
          </div>

          <p className="m-0 text-[12px] text-ink-muted">
            {daDu ? (
              <T k="promo.saving_now" v={{ so: tienSong(thung.giam) }} />
            ) : thung.tietKiemThemUocTinh ? (
              <T k="promo.est_saving" v={{ so: tienSong(thung.tietKiemThemUocTinh) }} />
            ) : null}
          </p>
        </div>
      )}

      {thung.soChai > 0 && <span className="block h-px bg-line" aria-hidden="true" />}

      {uuDai.mienPhiGiao ? (
        <p className="m-0 flex items-center gap-2.5 text-[14px] text-ink">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-[#3F6B45]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12.5 2.5 2.5L16 9.5" />
          </svg>
          <T k="promo.free_ship_done" />
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[14px] text-ink">
            <T k="promo.free_ship_more" v={{ so: tienSong(uuDai.giaoConThieu) }} />
          </p>
          <div className="h-1.5 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phanTramGiao}>
            <span
              className="block h-full bg-copper transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${phanTramGiao}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
