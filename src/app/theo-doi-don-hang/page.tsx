import type { Metadata } from "next";
import { Suspense } from "react";
import T from "@/components/T";
import TheoDoiDon from "@/components/TheoDoiDon";
import { layDonCuaKhach, layKhachHang } from "@/lib/khach-hang";

export const metadata: Metadata = {
  title: "Theo dõi đơn hàng",
  description: "Tra cứu tình trạng đơn hàng C.W. Wines bằng mã đơn và số điện thoại đặt hàng.",
  // Trang tra cứu cá nhân, không có nội dung cho bộ máy tìm kiếm.
  robots: { index: false, follow: false },
};

/**
 * Lớp vỏ Server Component để khai `metadata`. `TheoDoiDon` đọc `?ma=` bằng
 * `useSearchParams` nên bắt buộc nằm trong `<Suspense>`.
 */
export default async function Page() {
  // Chỉ tra được đơn của tài khoản đang đăng nhập (không dùng SĐT làm bằng chứng
  // sở hữu, vì hai tài khoản cùng SĐT sẽ thấy đơn của nhau).
  const kh = await layKhachHang();
  const donCuaToi = kh ? await layDonCuaKhach() : [];

  return (
    <Suspense fallback={<div className="container-site py-24 text-center text-[14px] text-ink-muted"><T k="track.loading" /></div>}>
      <TheoDoiDon dangNhap={!!kh} donCuaToi={donCuaToi} />
    </Suspense>
  );
}
