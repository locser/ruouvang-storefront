"use client";

import Link from "next/link";
import { useState } from "react";
import TheSanPham from "./TheSanPham";
import T, { TL } from "./T";
import Hien from "./Hien";
import type { KhoiDaNap } from "./TrangChu";
import type { Product } from "@/lib/data";
import { duongDanDanhMuc } from "@/lib/theme";

export interface TabDaNap {
  ten: string;
  /** Bản dịch theo hậu tố ngôn ngữ: `tenEn`, `tenKo`… */
  [truong: string]: unknown;
  danhMuc: string;
  sanPham: Product[];
}

/**
 * Một dải sản phẩm có tab.
 *
 * Tiêu đề serif canh giữa, tab dạng chữ có gạch chân đồng chạy theo mục đang
 * chọn (không còn nút hộp). Lưới tối đa 4 cột × 2 hàng để mỗi chai có chỗ thở.
 *
 * Sản phẩm của MỌI tab đã được máy chủ nạp sẵn và truyền xuống, nên chuyển tab
 * là tức thì, không gọi mạng, không có trạng thái chờ.
 */
export default function KhoiSanPhamTab({
  khoi,
  nhan,
}: {
  khoi: KhoiDaNap;
  /** Khoá i18n của dòng nhãn nhỏ phía trên tiêu đề. */
  nhan?: string;
}) {
  const { xemTatCa, tab } = khoi;
  const [dangChon, setDangChon] = useState(0);

  // Bỏ hẳn dải nếu không tab nào có hàng — thà không hiện còn hơn hiện một
  // tiêu đề lớn với khoảng trắng bên dưới.
  const coHang = tab.some((t) => t.sanPham.length > 0);
  if (!coHang) return null;

  const hienTai = tab[dangChon] ?? tab[0];

  return (
    <section className="container-site py-16 md:py-24">
      <Hien className="mb-12 text-center md:mb-14">
        {nhan && (
          <p className="nhan-nho mb-4">
            <T k={nhan} />
          </p>
        )}
        <h2 className="tieu-de-section gach-tieu-de">
          <TL obj={khoi} field="tieuDe" />
        </h2>
      </Hien>

      {tab.length > 1 && (
        <div
          className="cuon-ngang -mx-5 mb-12 flex items-center gap-x-9 overflow-x-auto px-5 md:mx-0 md:justify-center md:px-0"
          role="group"
          aria-label="Nhóm sản phẩm"
        >
          {tab.map((t, i) => {
            const dang = i === dangChon;
            return (
              <button
                key={t.danhMuc + i}
                type="button"
                onClick={() => setDangChon(i)}
                aria-pressed={dang}
                className={`relative shrink-0 whitespace-nowrap py-3 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                  dang ? "text-wine" : "text-ink-soft hover:text-ink"
                }`}
              >
                <TL obj={t} field="ten" />
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-px origin-center bg-copper transition-transform duration-500 ease-cellar ${
                    dang ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {hienTai.sanPham.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {hienTai.sanPham.slice(0, 8).map((p, k) => (
            <Hien key={p.id} tre={(k % 4) * 90}>
              <TheSanPham product={p} />
            </Hien>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center font-display text-[22px] italic text-ink-muted">
          <T k="home_tabs.this_selection_is_being_updated" />
        </p>
      )}

      {xemTatCa && (
        <div className="mt-16 text-center">
          <Link
            href={duongDanDanhMuc(hienTai.danhMuc || xemTatCa)}
            className="btn-wine-outline"
          >
            <T k="home_tabs.view_all" />
          </Link>
        </div>
      )}
    </section>
  );
}
