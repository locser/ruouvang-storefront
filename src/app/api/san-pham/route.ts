import { NextResponse } from "next/server";
import { laySanPhamTheoDanhMuc } from "@/lib/meili";

/**
 * Trả về sản phẩm thật của shop cho phần hiển thị ở trang chủ.
 *
 * Vì sao cần route này: trang chủ là Client Component, mà khoá publishable
 * `CONFIG_PUBLISHABLE_KEY_MEDUSA` chỉ được phép nằm phía server. Trình duyệt gọi
 * route này, route gọi Medusa bằng khoá riêng của shop rồi trả dữ liệu đã
 * chuẩn hoá — khoá không bao giờ lọt vào bundle trình duyệt.
 *
 * Đồng thời sửa hai lỗi của bản cũ: không còn tải 100 sản phẩm đầu của cả CSDL
 * rồi lọc theo từ khoá tên (kênh bán đã lo việc tách shop), và giá lấy từ
 * `calculated_price` nên đúng với CSDL.
 */
export async function GET(request: Request) {
  const thamSo = new URL(request.url).searchParams;
  const soLuongRaw = Number(thamSo.get("so-luong") ?? 12);
  const soLuong = Math.min(48, Math.max(1, Number.isFinite(soLuongRaw) ? soLuongRaw : 12));

  const { sanPham } = await laySanPhamTheoDanhMuc(undefined, soLuong, 0);

  return NextResponse.json(
    { sanPham },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } }
  );
}
