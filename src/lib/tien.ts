/**
 * Định dạng tiền tệ — dùng được ở CẢ Server lẫn Client Component.
 *
 * Vì sao tách ra khỏi `medusa-catalog.ts`: tệp đó mở đầu bằng `import
 * "server-only"`, nên bất kỳ Client Component nào lỡ nhập một hàm từ đó — kể
 * cả một hàm định dạng chuỗi thuần tuý — đều làm hỏng cả bản dựng với thông
 * báo *"You're importing a component that needs server-only"*. Thẻ sản phẩm và
 * trang chi tiết đều là Client Component và đều cần định dạng giá.
 *
 * ⚠️ TIỀN TỆ (ADR-010): VND là zero-decimal. Số Medusa trả về đã là ĐỒNG, in
 * thẳng — KHÔNG chia 100.
 *
 * Theo ngôn ngữ: tiếng Việt "499.000đ", tiếng Anh "₫499,000".
 * Giao diện hiển thị cả hai bản qua `<Tien so={…} />` (components/T.tsx).
 */
import type { Locale } from "@/i18n/config";

/** 499000 → "499.000đ" (vi) · "₫499,000" (en) */
export function dinhDangTien(so: number, locale: Locale = "vi"): string {
  const n = Math.round(so || 0);
  if (locale === "en") return `₫${n.toLocaleString("en-US")}`;
  return `${n.toLocaleString("vi-VN")}đ`;
}

/** Cùng một số, đủ mọi ngôn ngữ: `{ vi: "499.000đ", en: "₫499,000" }`. */
export function tienSong(so: number): Record<Locale, string> {
  return { vi: dinhDangTien(so, "vi"), en: dinhDangTien(so, "en") };
}
