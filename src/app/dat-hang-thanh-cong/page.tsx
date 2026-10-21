import XacNhanDonHang from "@/components/XacNhanDonHang";

export const metadata = {
  title: "Đặt hàng thành công — C.W. Wines",
  description: "Đơn hàng đã được tiếp nhận, nhân viên C.W. Wines đang chuẩn bị giao hàng.",
  // Trang riêng của từng khách, không có nội dung cho bộ máy tìm kiếm.
  robots: { index: false, follow: false },
};

/**
 * Trang xác nhận đơn hàng.
 *
 * Toàn bộ nội dung nằm ở `XacNhanDonHang` (Client Component) vì đơn hàng được
 * giữ trong `sessionStorage` của trình duyệt — máy chủ không biết gì về nó. Giữ
 * lớp vỏ này là Server Component để vẫn khai được `metadata`.
 */
export default function SuccessPage() {
  return (
    <div className="container-site py-6">
      <div className="mx-auto max-w-3xl">
        <XacNhanDonHang />
      </div>
    </div>
  );
}
