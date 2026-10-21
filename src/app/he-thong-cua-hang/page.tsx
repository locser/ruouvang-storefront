import type { Metadata } from "next";
import TimCuaHang from "@/components/TimCuaHang";
import { TINH_THANH } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Hệ thống cửa hàng C.W. Wines | Fine Wines & Spirits",
  description: `Cửa hàng rượu vang C.W. Wines tại ${TINH_THANH.map((t) => t.ten).join(
    ", "
  )}. Xem bản đồ, số điện thoại và chỉ đường tới cửa hàng gần nhất.`,
};

/**
 * Trang "Hệ thống cửa hàng" — bản dựng lại của
 * https://cwwines.com/pages/he-thong-cua-hang
 *
 * Dữ liệu tĩnh (nằm trong `src/lib/cwwines-stores.json`), không gọi Medusa:
 * Danh sách cửa hàng gần như không đổi, và trang phải hiện được cả khi backend
 * chết — khách đang trên đường tìm cửa hàng thì cần địa chỉ, không cần catalog.
 */
export default function Page() {
  return <TimCuaHang />;
}
