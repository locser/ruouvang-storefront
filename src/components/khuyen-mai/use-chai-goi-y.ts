"use client";

import { useEffect, useMemo, useState } from "react";
import { useGioHang } from "@/lib/gio-hang-context";
import { layNhan } from "@/lib/huong-vi";
import type { SanPhamTim } from "@/lib/meili";

/**
 * Chọn MỘT chai gợi ý để khách hoàn thiện thùng 6 chai ("Gợi ý cho chai thứ 6").
 *
 * Lấy danh sách từ `/api/san-pham` (Meilisearch), bỏ chai đã có trong giỏ, ưu tiên chai
 * "dễ uống" (cùng quy tắc nhãn ở thẻ sản phẩm) — dễ làm quen nên khách dễ bấm thêm. Không có
 * chai nào "dễ uống" thì lấy chai đầu tiên còn lại. Lỗi mạng: trả null, khối gợi ý tự ẩn.
 */
export function useChaiGoiY(): SanPhamTim | null {
  const { danhSach } = useGioHang();
  const [ds, setDs] = useState<SanPhamTim[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/san-pham?so-luong=36", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { sanPham: [] }))
      .then((d) => setDs(Array.isArray(d.sanPham) ? d.sanPham : []))
      .catch(() => {
        /* lỗi mạng: im lặng, đây chỉ là phần gợi ý thêm */
      });
    return () => ac.abort();
  }, []);

  return useMemo(() => {
    const daCo = new Set(danhSach.map((m) => m.handle));
    const ungVien = ds.filter(
      (p) =>
        p.thumbnail &&
        p.price_vnd > 0 &&
        !daCo.has(p.handle) &&
        !/\b(pack|case|dozen|carton)\b/i.test(p.title)
    );
    const deUong = ungVien.find((p) =>
      layNhan({ title: p.title, handle: p.handle, loai: p.loai, tags: p.tags, giaVnd: p.price_vnd }, 3).includes(
        "de-uong"
      )
    );
    return deUong ?? ungVien[0] ?? null;
  }, [ds, danhSach]);
}
