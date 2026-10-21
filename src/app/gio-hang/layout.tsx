import type { Metadata } from "next";

/**
 * Lớp bọc chỉ để khai `metadata` — SỬA BUG-R09.
 *
 * `app/gio-hang/page.tsx` là Client Component (nó dùng `useGioHang`), mà Client
 * Component thì KHÔNG khai được `metadata`. Hệ quả: trang giỏ hàng thừa hưởng
 * nguyên thẻ title của trang chủ, đúng hiện tượng "hai trang dùng chung title"
 * mà báo cáo kiểm thử ghi nhận. Đặt một `layout.tsx` cạnh trang là cách chính
 * thống của Next.js để trang client vẫn có thẻ meta riêng.
 */
export const metadata: Metadata = {
  title: "Giỏ hàng",
  description:
    "Xem lại các chai rượu đang chờ thanh toán tại C.W. Wines.",
  robots: { index: false, follow: true },
};

export default function LayoutGioHang({ children }: { children: React.ReactNode }) {
  return children;
}
