"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import T from "./T";
import { useGioHang } from "@/lib/gio-hang-context";
import type { Product } from "@/lib/data";

interface Props {
  product: Product;
  /** Số lượng thêm mỗi lần bấm (trang chi tiết cho phép chọn số lượng). */
  soLuong?: number;
  className?: string;
  /** Gọi thêm sau khi đã bỏ vào giỏ (ví dụ để chuyển sang trang giỏ hàng). */
  onDaThem?: () => void;
  /** Chữ nối sau nhãn "Thêm vào giỏ", vd " · 385.000đ". */
  hauTo?: ReactNode;
}

/**
 * Nút "THÊM VÀO GIỎ" dùng chung cho lưới sản phẩm và trang chi tiết.
 *
 * Nhãn song ngữ in cả hai bản rồi để CSS ẩn bên không dùng (xem T.tsx) —
 * nút này là Client Component nên vẫn theo đúng cơ chế chung của cả site.
 */
export default function NutThemVaoGio({
  product,
  soLuong = 1,
  className = "btn-wine w-full",
  onDaThem,
  hauTo,
}: Props) {
  const { themVaoGio } = useGioHang();
  const [vuaThem, setVuaThem] = useState(false);
  /**
   * Lý do KHÔNG thêm được — SỬA BUG-R24 (07/08/2026).
   *
   * Trước đây nút luôn hiện “Đã thêm ✓” dù `themVaoGio` có bỏ qua hay không.
   * Khách bấm bốn món mà giỏ chỉ nhận ba, tưởng giỏ hàng bị giới hạn ba dòng.
   */
  const [loi, setLoi] = useState<{ k: string; v?: Record<string, string | number> } | null>(null);
  const boDem = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn timer khi component bị gỡ để tránh setState trên component đã unmount.
  useEffect(() => {
    return () => {
      if (boDem.current) clearTimeout(boDem.current);
    };
  }, []);

  const xuLyBam = () => {
    const kq = themVaoGio(product, soLuong);

    if (boDem.current) clearTimeout(boDem.current);

    // ⚠️ CHỈ báo “Đã thêm ✓” và CHỈ chuyển trang khi giỏ THẬT SỰ nhận hàng.
    // Gọi `onDaThem?.()` vô điều kiện như bản cũ là đẩy khách sang trang giỏ
    // hàng để họ tự phát hiện món vừa bấm không có ở đó.
    if (!kq.ok) {
      setVuaThem(false);
      setLoi(kq.loi ?? { k: "cart.could_not_add" });
      // Giữ thông báo lâu hơn lời khen (2s) — đây là tin xấu, khách cần kịp đọc.
      boDem.current = setTimeout(() => setLoi(null), 4000);
      return;
    }

    setLoi(null);
    setVuaThem(true);
    boDem.current = setTimeout(() => setVuaThem(false), 2000);
    onDaThem?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={xuLyBam}
        aria-live="polite"
        className={`${className} ${
          vuaThem ? "!border-wine !bg-wine !text-page" : ""
        } ${loi ? "!cursor-not-allowed !border-line !bg-stone !text-ink-muted" : ""}`}
      >
        {vuaThem ? (
          <>
            <T k="add_to_cart.added" />
          </>
        ) : loi ? (
          <>
            <T k="add_to_cart.unavailable" />
          </>
        ) : (
          <>
            <>
            <T k="add_to_cart.add" />
            <span className="normal-case">{hauTo}</span>
          </>
          </>
        )}
      </button>

      {/* `role="alert"` để trình đọc màn hình đọc ngay, không phải chờ khách
          tự tìm. Trước đây khách khiếm thị hoàn toàn không biết là đã thất bại. */}
      {loi && (
        <p role="alert" className="mt-2 text-[13px] text-wine">
          <T k={loi.k} v={loi.v} />
        </p>
      )}
    </>
  );
}
