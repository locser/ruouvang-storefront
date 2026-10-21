import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";
import { MESSAGES } from "./messages";

export type Vars = Record<string, string | number>;

/** Thay `{ten}` bằng giá trị tương ứng; tham số không được truyền thì giữ nguyên. */
export function noiSuy(mau: string, vars?: Vars): string {
  if (!vars) return mau;
  return mau.replace(/\{(\w+)\}/g, (nguyen, ten: string) =>
    ten in vars ? String(vars[ten]) : nguyen
  );
}

/**
 * Dịch một khoá. Thiếu bản dịch ở `locale` thì rơi về ngôn ngữ gốc; thiếu cả
 * hai thì trả về chính khoá (dễ thấy trên màn hình hơn một chuỗi rỗng).
 */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const mau = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE]?.[key];
  if (mau === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Thiếu khoá "${key}"`);
    }
    return key;
  }
  return noiSuy(mau, vars);
}

/**
 * Đọc trường dữ liệu theo ngôn ngữ, quy ước hậu tố viết hoa chữ đầu:
 * `ten` (gốc, tiếng Việt) · `tenEn` · `tenKo`… Thiếu thì dùng trường gốc.
 */
export function layTruong(
  obj: Record<string, any> | null | undefined,
  truong: string,
  locale: Locale
): string {
  if (!obj) return "";
  if (locale === DEFAULT_LOCALE) return String(obj[truong] ?? "");
  const hauTo = locale.charAt(0).toUpperCase() + locale.slice(1);
  const giaTri = obj[`${truong}${hauTo}`];
  return String(giaTri ?? obj[truong] ?? "");
}

/** Dựng bản đồ `{ vi: …, en: … }` bằng cách gọi `fn` cho từng ngôn ngữ. */
export function theoNgonNgu<T>(fn: (locale: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(LOCALES.map((l) => [l, fn(l)])) as Record<Locale, T>;
}

/** Giá trị của một trường dữ liệu ở mọi ngôn ngữ (quy ước hậu tố như `layTruong`). */
export function giaTriTheoNgonNgu(
  obj: Record<string, any> | null | undefined,
  truong: string
): Record<Locale, string> {
  return theoNgonNgu((l) => layTruong(obj, truong, l));
}

/** Như `layTruong` nhưng cho trường kiểu mảng chuỗi (`camKet`/`camKetEn`/…). */
export function layMang(obj: Record<string, any>, truong: string, locale: Locale): string[] {
  const hauTo = locale === DEFAULT_LOCALE ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);
  const mang = obj[`${truong}${hauTo}`];
  return Array.isArray(mang) ? mang : Array.isArray(obj[truong]) ? obj[truong] : [];
}
