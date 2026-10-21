"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hiện dần khi cuộn tới — chuyển động duy nhất của thân trang.
 *
 * Cách làm để KHÔNG phá nội dung:
 *   · HTML máy chủ vẽ ra ở trạng thái đã hiện (không có `data-hien`), nên công
 *     cụ tìm kiếm, khách tắt JavaScript và ảnh chụp trang đều thấy đủ nội dung.
 *   · Sau khi gắn kết, chỉ khối NẰM DƯỚI màn hình mới được đặt `cho` (ẩn nhẹ),
 *     rồi chuyển `xong` khi vào tầm nhìn. Khối đã ở trên màn hình thì giữ nguyên
 *     — không nháy ở đầu trang.
 *   · `prefers-reduced-motion` được CSS xử lý (xem globals.css): trạng thái ẩn
 *     bị vô hiệu hoá hẳn.
 */
export default function Hien({
  children,
  className,
  tre = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Trễ (ms) để các phần tử cùng hàng hiện nối nhau thay vì cùng lúc. */
  tre?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const toa = el.getBoundingClientRect();
    if (toa.top < window.innerHeight * 0.92) return; // đã ở trên màn hình

    el.setAttribute("data-hien", "cho");
    const quanSat = new IntersectionObserver(
      (muc) => {
        if (muc.some((m) => m.isIntersecting)) {
          // Hai khung hình để trình duyệt kịp ghi nhận trạng thái `cho`.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => el.setAttribute("data-hien", "xong"))
          );
          quanSat.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    quanSat.observe(el);
    return () => quanSat.disconnect();
  }, []);

  const Bao = Tag as any;
  return (
    <Bao
      ref={ref}
      className={className}
      style={tre ? ({ "--tre": `${tre}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Bao>
  );
}
