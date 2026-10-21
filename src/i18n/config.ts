/**
 * ĐĂNG KÝ NGÔN NGỮ — nguồn sự thật duy nhất.
 *
 * THÊM MỘT NGÔN NGỮ MỚI (ví dụ tiếng Hàn `ko`) chỉ cần 3 bước, KHÔNG sửa component nào:
 *   1. Thêm `"ko"` vào `LOCALES` và một dòng vào `LOCALE_META` dưới đây.
 *   2. Tạo `messages/ko.json` (sao chép `vi.json` rồi dịch) và đăng ký trong `messages/index.ts`.
 *   3. (Tuỳ chọn) Dữ liệu động có hậu tố ngôn ngữ — `tenKo`, `tieuDeKo`… trong các file
 *      `lib/*.json`, hoặc `description_ko` trong metadata sản phẩm Medusa. Thiếu thì
 *      tự dùng bản tiếng Việt, trang không vỡ.
 * `npm test` có bài kiểm tra báo chính xác khoá nào `ko.json` còn thiếu.
 *
 * Module thuần, dùng được ở cả Server lẫn Client Component.
 */

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Ngôn ngữ gốc: nội dung viết trước, và là nơi rơi về khi bản dịch còn thiếu. */
export const DEFAULT_LOCALE: Locale = "vi";

export const LOCALE_META: Record<
  Locale,
  {
    /** Nhãn ngắn trên công tắc. */
    nhan: string;
    /** Tên ngôn ngữ viết bằng chính ngôn ngữ đó. */
    ten: string;
    /** Mã BCP-47 cho thẻ `lang`, `Intl.NumberFormat`… */
    bcp47: string;
    /** Mã locale của module blog trong Medusa (`?locale=…`). */
    medusa: string;
  }
> = {
  vi: { nhan: "VI", ten: "Tiếng Việt", bcp47: "vi-VN", medusa: "vi-VN" },
  en: { nhan: "EN", ten: "English", bcp47: "en-AU", medusa: "en-US" },
};

/** Khoá localStorage lưu lựa chọn ngôn ngữ của khách. */
export const KHOA_LUU_NGON_NGU = "cwwines-ngon-ngu";

export function laLocale(x: unknown): x is Locale {
  return typeof x === "string" && (LOCALES as readonly string[]).includes(x);
}
