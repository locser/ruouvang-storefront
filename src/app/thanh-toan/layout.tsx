import type { Metadata } from "next";

/**
 * Lớp bọc chỉ để khai `metadata` — SỬA BUG-R09.
 *
 * Cùng lý do với `app/gio-hang/layout.tsx`: trang đặt hàng là Client Component
 * nên không tự khai được thẻ meta, và trước đây dùng lại title của trang chủ.
 */
export const metadata: Metadata = {
  title: "Đặt hàng",
  description:
    "Điền thông tin nhận hàng và chọn hình thức thanh toán cho đơn rượu vang C.W. Wines.",
  robots: { index: false, follow: false },
};

export default function LayoutThanhToan({ children }: { children: React.ReactNode }) {
  return children;
}
