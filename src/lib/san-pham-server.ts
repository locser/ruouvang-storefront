/**
 * Lấy sản phẩm THẬT từ Medusa cho trang chi tiết — CHỈ CHẠY PHÍA SERVER.
 *
 * Bản Hasaki của file này có nhánh dự phòng rơi về `HASAKI_PRODUCTS` (30 sản
 * phẩm cứng) khi backend không phản hồi. Bỏ hẳn nhánh đó: xem ghi chú ở
 * `lib/data.ts` — hiện hàng giả mà không dấu hiệu nào còn tệ hơn hiện lỗi.
 *
 * ⚠️ Giá đọc từ `calculated_price.calculated_amount`, KHÔNG phải
 * `variants[0].prices[0].amount`: Medusa v2 không trả trường `prices` ra Store
 * API, đọc nhầm chỗ đó là luôn nhận `undefined` rồi rơi về giá cứng. Quy tắc
 * này nằm gọn trong `medusa-catalog.ts`, ở đây chỉ dùng lại.
 */

import "server-only";
import { doiSangProduct, type Product } from "./data";
import { sanPhamBanDuoc } from "./san-pham-ban-duoc";
import {
  laySanPhamGoiY as laySanPhamGoiYMedusa,
  laySanPhamTheoHandle,
} from "./medusa-catalog";

/**
 * Một sản phẩm theo handle, hoặc `null` nếu không có.
 *
 * Dùng `laySanPhamTheoHandle` của `medusa-catalog.ts` thay vì tự `fetch`, nhờ
 * đó `generateMetadata` và thân trang cùng gọi cho một handle chỉ tốn MỘT lượt
 * đi Medusa (React `cache()` gộp lại), và kết quả được Data Cache giữ lại.
 */
export async function fetchSanPhamTheoHandleAsync(
  handle: string
): Promise<Product | null> {
  const sp = await laySanPhamTheoHandle(handle);
  return sp && sanPhamBanDuoc({ gia: sp.gia }) ? doiSangProduct(sp) : null;
}

/**
 * Sản phẩm gợi ý — cùng danh mục với sản phẩm đang xem.
 *
 * Danh mục lấy từ chính bản ghi sản phẩm (`danhMucId`, có được nhờ
 * `laySanPhamTheoHandle` hỏi kèm `*categories`), nên hàm này KHÔNG tốn thêm
 * lượt gọi nào: `laySanPhamTheoHandle` đã được React `cache()` gộp với lời gọi
 * ở thân trang và ở `generateMetadata`.
 */
export async function laySanPhamGoiYAsync(
  handle: string,
  soLuong = 5
): Promise<Product[]> {
  const sp = await laySanPhamTheoHandle(handle);
  const ds = await laySanPhamGoiYMedusa(sp?.danhMucId ?? null, handle, soLuong);
  return ds
    .filter((sanPham) => sanPhamBanDuoc({ gia: sanPham.gia }))
    .map(doiSangProduct);
}
