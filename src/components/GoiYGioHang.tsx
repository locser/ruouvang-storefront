"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TheLuoi from "./TheLuoi";
import T from "./T";

interface Goi {
  id: string;
  title: string;
  handle: string;
  price_vnd: number;
  thumbnail: string;
}

/**
 * Gợi ý chai khác ở trang giỏ hàng — cho cả giỏ có hàng lẫn giỏ trống, để khách
 * không bị cụt đường. Lấy từ `/api/san-pham` (hàng mới nhất của shop), bỏ những
 * chai đã nằm trong giỏ.
 *
 * Không có số liệu "bán chạy" hay "khách khác cũng mua" trong dữ liệu hiện có nên
 * tiêu đề chỉ nói "Gợi ý" — không khẳng định điều chưa đo được.
 */
export default function GoiYGioHang({
  daCo,
  tieuDe,
}: {
  /** Handle các chai đã có trong giỏ. */
  daCo: string[];
  /** Khoá i18n của tiêu đề khối. */
  tieuDe: string;
}) {
  const [ds, setDs] = useState<Goi[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/san-pham?so-luong=16", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { sanPham: [] }))
      .then((d) => setDs(Array.isArray(d.sanPham) ? d.sanPham : []))
      .catch(() => {
        /* lỗi mạng: im lặng, khối này chỉ là phần thêm */
      });
    return () => ac.abort();
  }, []);

  const hien = ds.filter((p) => !daCo.includes(p.handle)).slice(0, 4);
  if (hien.length === 0) return null;

  return (
    <section className="mt-20 border-t border-line pt-14 md:mt-28 md:pt-16">
      <div className="mb-10 text-center">
        <p className="nhan-nho mb-3">
          <T k="common.suggested" />
        </p>
        <h2 className="text-[32px] font-normal md:text-[40px]">
          <T k={tieuDe} />
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
        {hien.map((p) => (
          <TheLuoi
            key={p.id}
            handle={p.handle}
            title={p.title}
            thumbnail={p.thumbnail}
            gia={p.price_vnd}
          />
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/danh-muc/welcome20-discount" className="btn-wine-outline">
          <T k="cart_suggest.view_the_full_collection" />
        </Link>
      </div>
    </section>
  );
}

/**
 * Nhắc nhẹ hoàn thiện một thùng 6 chai. Chỉ nói số chai còn thiếu — KHÔNG hứa
 * giảm giá hay miễn phí giao hàng vì shop chưa có chính sách đó (phí hiện cố định).
 * Khi có chính sách thật, thêm vào dòng chữ ở đây.
 */
export function NhacThung6({ soLuong }: { soLuong: number }) {
  const con = soLuong % 6 === 0 ? 0 : 6 - (soLuong % 6);
  if (soLuong === 0 || con === 0) return null;
  const da = 6 - con;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border border-line bg-cream px-5 py-4">
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`h-6 w-2.5 rounded-t-[5px] border ${
              i < da ? "border-wine bg-wine" : "border-copper bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="m-0 min-w-0 flex-1 text-[14px] leading-snug text-ink">
        <T k="cart_suggest.add_more_to_complete_a" v={{ con }} />
      </p>
      <Link
        href="/danh-muc/99-6-packs"
        className="lien-ket text-[11px] font-medium uppercase tracking-[0.16em] text-wine"
      >
        <T k="cart_suggest.see_6_packs" />
      </Link>
    </div>
  );
}
