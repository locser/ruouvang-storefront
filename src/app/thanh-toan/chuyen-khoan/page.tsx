import type { Metadata } from "next";
import ChuyenKhoan from "@/components/ChuyenKhoan";

export const metadata: Metadata = {
  title: "Thanh toán chuyển khoản",
  description: "Chuyển khoản để hoàn tất đơn rượu vang C.W. Wines.",
  // Trang riêng của từng đơn, không có nội dung cho bộ máy tìm kiếm.
  robots: { index: false, follow: false },
};

/**
 * Lớp vỏ Server Component chỉ để khai `metadata`; toàn bộ nội dung nằm ở
 * `ChuyenKhoan` (Client Component) vì đơn vừa đặt được giữ trong sessionStorage.
 * Khung tối giản (chỉ logo + đường về giỏ) do `KhungTrang` áp cho mọi `/thanh-toan/*`.
 */
export default function Page() {
  return <ChuyenKhoan />;
}
