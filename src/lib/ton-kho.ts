/**
 * Tồn kho GIẢ LẬP cho site mẫu.
 *
 * ⚠️ ĐÂY LÀ SỐ BỊA, KHÔNG PHẢI TỒN KHO THẬT. Ba site mẫu
 * (Hasaki/Yody/Coolmate) nạp sản phẩm với `manage_inventory: false` nên Medusa
 * không giữ bản ghi tồn kho nào — mọi sản phẩm đều báo `in_stock: false`, tức
 * là cả catalog hiện "hết hàng". Số giả lập ở đây chỉ để giao diện demo trông
 * sống động.
 *
 * ⚠️ KHI CHẠY THẬT PHẢI BỎ FILE NÀY và đọc tồn kho từ Medusa. Quy tắc §6.4 của
 * ADMIN_GUIDE: "giá và tồn kho nói với khách LUÔN đọc lại từ Medusa".
 *
 * Vì sao KHÔNG dùng `Math.random()`: số phải ỔN ĐỊNH theo sản phẩm. Random mỗi
 * lần render thì cùng một món hiện "còn 3" ở trang danh mục, "còn 47" ở trang
 * chi tiết, và đổi số mỗi lần bấm F5 — nhìn là biết bịa. Ở đây số suy ra từ
 * `id` nên một sản phẩm luôn cho cùng một con số ở mọi nơi, mọi lần tải.
 */

/** Băm chuỗi thành số nguyên không âm, ổn định giữa các lần chạy. */
function bam(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // giữ trong phạm vi 32 bit
  }
  return Math.abs(h);
}

export interface TonKho {
  /** Số lượng còn, 0 nghĩa là hết hàng. */
  soLuong: number;
  conHang: boolean;
  /** Sắp hết — dùng để hiện nhãn "Chỉ còn N sản phẩm". */
  sapHet: boolean;
}

/**
 * Tồn kho giả lập, ổn định theo `id` sản phẩm.
 *
 * Phân bố cố ý: ~8% hết hàng, ~17% sắp hết (1–5), còn lại 6–120.
 */
export function tonKhoGiaLap(id: string): TonKho {
  const h = bam(id || "");
  const bac = h % 100;

  let soLuong: number;
  if (bac < 8) soLuong = 0;
  else if (bac < 25) soLuong = 1 + (h % 5);
  else soLuong = 6 + (h % 115);

  return {
    soLuong,
    conHang: soLuong > 0,
    sapHet: soLuong > 0 && soLuong <= 5,
  };
}

/**
 * Dựng `TonKho` từ số TỒN KHO THẬT của Medusa — thay cho `tonKhoGiaLap`.
 *
 * Thêm 07/08/2026, sau khi `nap-ton-kho.sql` nạp tồn kho thật cho shop này.
 * Bảo toàn kiểu trả về để các component hiện nhãn "còn N sản phẩm" không
 * phải sửa gì.
 *
 * `null`/`undefined` = shop không theo dõi kho món này ⇒ coi như còn hàng,
 * KHÔNG phải hết hàng. Gộp hai trường hợp là chặn nhầm cả catalog — đúng lỗi
 * đã xảy ra với `manage_inventory: false` hồi 04/08.
 */
export function tonKhoThat(soLuong: number | null | undefined): TonKho {
  if (soLuong === null || soLuong === undefined) {
    return { soLuong: 99, conHang: true, sapHet: false };
  }
  const n = Math.max(0, Math.floor(soLuong));
  return { soLuong: n, conHang: n > 0, sapHet: n > 0 && n <= 5 };
}
