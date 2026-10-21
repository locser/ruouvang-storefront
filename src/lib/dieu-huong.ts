/**
 * Điều hướng chính của boutique.
 *
 * Bản cũ chạy ngang cả 45 bộ sưu tập trong một dải cuộn — đúng kiểu siêu thị.
 * Ở đây giữ năm lối vào có ý nghĩa; riêng "Nhà rượu" mở một bảng nhỏ liệt kê
 * các nhà sản xuất. Tên và đường dẫn nhà rượu LẤY TỪ `MENU` (cùng nguồn với
 * trước), chỉ chọn lại và sắp xếp — nên đổi tên bộ sưu tập ở JSON là đổi theo.
 */
import { MENU, duongDanDanhMuc } from "./theme";

export interface LoiVao {
  ten: string;
  tenEn: string;
  href: string;
}

/** Các nhà rượu nổi bật, theo thứ tự hiển thị. Handle không có hàng sẽ tự rơi ra. */
const NHA_RUOU_NOI_BAT = [
  "stonehaven",
  "schild-estate",
  "ulithorne",
  "reschke",
  "stepping-stone",
  "cape-barren",
  "bone-dry",
  "dem-bones",
  "schoolhouse",
  "limited-vineyard-release",
];

export const NHA_RUOU: LoiVao[] = NHA_RUOU_NOI_BAT.flatMap((handle) => {
  const m = MENU.find((x) => x.handle === handle);
  return m ? [{ ten: m.ten, tenEn: m.tenEn, href: duongDanDanhMuc(handle) }] : [];
});

export const LOI_VAO_CHINH: LoiVao[] = [
  {
    ten: "Tất cả rượu vang",
    tenEn: "All wines",
    href: duongDanDanhMuc("welcome20-discount"),
  },
  { ten: "Sự kiện", tenEn: "Events", href: "/su-kien" },
];

export const LOI_VAO_PHU: LoiVao[] = [
  { ten: "Cẩm nang", tenEn: "Journal", href: "/blog" },
  { ten: "Cửa hàng", tenEn: "Boutiques", href: "/he-thong-cua-hang" },
];
