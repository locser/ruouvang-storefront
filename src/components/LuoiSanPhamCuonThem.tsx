"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TheLuoi from "./TheLuoi";

/**
 * Lưới sản phẩm tự nạp thêm khi cuộn tới cuối — thay cho phân trang bấm số.
 *
 * Trang đầu do server dựng sẵn (tốt cho SEO và cho lần tải đầu). Từ trang 2 trở
 * đi client gọi `/api/danh-muc-sp`. Có nút "Xem thêm" làm phương án dự phòng
 * cho trình duyệt không hỗ trợ IntersectionObserver, và để khách chủ động bấm.
 */

export interface TheSanPham {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  gia: number;
  giaGoc: number | null;
  tonKho: { soLuong: number; conHang: boolean; sapHet: boolean };
}

export default function LuoiSanPhamCuonThem({
  handleDanhMuc,
  sanPhamDau,
  tong,
  moiTrang,
}: {
  handleDanhMuc: string;
  sanPhamDau: TheSanPham[];
  tong: number;
  moiTrang: number;
}) {
  const [ds, setDs] = useState<TheSanPham[]>(sanPhamDau);
  const [trang, setTrang] = useState(1);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState(false);
  const moc = useRef<HTMLDivElement>(null);

  const conNua = ds.length < tong;

  const taiThem = useCallback(async () => {
    if (dangTai || !conNua) return;
    setDangTai(true);
    setLoi(false);
    try {
      const res = await fetch(
        `/api/danh-muc-sp?handle=${encodeURIComponent(handleDanhMuc)}&trang=${trang + 1}`
      );
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      const them: TheSanPham[] = Array.isArray(d.sanPham) ? d.sanPham : [];
      if (them.length > 0) {
        // Lọc trùng phòng khi thứ tự từ Store API đổi giữa hai lần gọi.
        setDs((cu) => {
          const daCo = new Set(cu.map((x) => x.id));
          return [...cu, ...them.filter((x) => !daCo.has(x.id))];
        });
        setTrang((t) => t + 1);
      }
    } catch (e) {
      setLoi(true);
    } finally {
      setDangTai(false);
    }
  }, [dangTai, conNua, handleDanhMuc, trang]);

  // Chạm mốc cuối lưới thì nạp tiếp.
  useEffect(() => {
    if (!conNua || loi) return;
    const el = moc.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (mucs) => {
        if (mucs.some((m) => m.isIntersecting)) taiThem();
      },
      { rootMargin: "600px" } // nạp trước khi khách nhìn thấy đáy
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [conNua, loi, taiThem]);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
        {ds.map((p) => (
          <TheLuoi
            key={p.id}
            handle={p.handle}
            title={p.title}
            thumbnail={p.thumbnail}
            gia={p.gia}
            giaGoc={p.giaGoc}
            hetHang={!p.tonKho.conHang}
            sapHet={p.tonKho.sapHet}
            soLuong={p.tonKho.soLuong}
          />
        ))}
      </div>

      {/* Mốc kích hoạt nạp thêm */}
      <div ref={moc} aria-hidden="true" className="h-px w-full" />

      <div className="mt-16 flex flex-col items-center gap-4">
        {dangTai && (
          <span className="text-[13px] text-ink-muted">Đang tải thêm sản phẩm…</span>
        )}

        {loi && (
          <button
            type="button"
            onClick={taiThem}
            className="btn-wine-outline"
          >
            Tải không được — bấm để thử lại
          </button>
        )}

        {!dangTai && !loi && conNua && (
          <button
            type="button"
            onClick={taiThem}
            className="btn-wine-outline"
          >
            Xem thêm sản phẩm
          </button>
        )}

        <span className="text-[12px] tracking-wide text-ink-soft">
          Đã xem {ds.length.toLocaleString("vi-VN")} / {tong.toLocaleString("vi-VN")} sản phẩm
        </span>
      </div>
    </>
  );
}
