import type { ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { layTruong, translate, type Vars } from "@/i18n/translate";
import { tienSong } from "@/lib/tien";

/**
 * ĐA NGÔN NGỮ (i18n) — ba component, cùng một cơ chế hiển thị.
 *
 * Mỗi component in ra MỌI ngôn ngữ trong `LOCALES`, bọc trong `<span data-l="xx">`;
 * CSS (sinh từ `LOCALES` ở `layout.tsx`) chỉ giữ lại ngôn ngữ khớp thẻ `<html lang>`.
 * Nhờ vậy trang vẫn render tĩnh/ISR như trước, đổi ngôn ngữ tức thì không tải
 * lại, không lệch hydrate, và thêm ngôn ngữ không phải sửa component nào.
 *
 *   <T k="header.search" />                      chuỗi giao diện, tra trong messages/*.json
 *   <T k="product.only_left" v={{ n: 3 }} />     có tham số {n}
 *   <TL obj={muc} field="ten" />                 dữ liệu động: ten · tenEn · tenKo…
 *   <L values={{ vi: a, en: b }} />              nội dung đã có sẵn theo từng ngôn ngữ
 *
 * Thuộc tính HTML (placeholder, aria-label…) không bọc được bằng span; xem `useT`.
 */

/** Tham số của `<T v>`. Giá trị có thể khác theo ngôn ngữ: `{ vi: …, en: … }` (xem `tienSong`). */
export type VarsNgonNgu = Record<string, string | number | Partial<Record<Locale, string | number>>>;

/** Chọn bản tham số đúng cho ngôn ngữ `l`; thiếu thì rơi về ngôn ngữ gốc. */
function thamSoCho(v: VarsNgonNgu | undefined, l: Locale): Vars | undefined {
  if (!v) return undefined;
  return Object.fromEntries(
    Object.entries(v).map(([ten, gia]) => [
      ten,
      typeof gia === "object" ? (gia[l] ?? gia[DEFAULT_LOCALE] ?? "") : gia,
    ])
  );
}

export default function T({
  k,
  v,
  className,
  emClassName,
}: {
  k: string;
  v?: VarsNgonNgu;
  className?: string;
  /** Lớp CSS cho đoạn `<em>…</em>` trong bản dịch (nếu có). */
  emClassName?: string;
}) {
  return (
    <>
      {LOCALES.map((l) => (
        <span key={l} data-l={l} className={className}>
          {chuSongPhong(translate(l, k, thamSoCho(v, l)), emClassName)}
        </span>
      ))}
    </>
  );
}

/**
 * Bản dịch được phép chứa đúng hai thẻ: `<br/>` (xuống dòng) và `<em>…</em>`
 * (nhấn mạnh) — đủ cho các tiêu đề kiểu "Rượu vang Úc,<br/><em>chọn từng chai</em>".
 * Ngoài hai thẻ này mọi ký tự được in nguyên văn.
 */
function chuSongPhong(text: string, emClassName?: string): ReactNode {
  if (!text.includes("<")) return text;
  return text.split(/(<br\s*\/>|<em>[\s\S]*?<\/em>)/g).map((p, i) =>
    /^<br/.test(p) ? (
      <br key={i} />
    ) : p.startsWith("<em>") ? (
      <em key={i} className={emClassName}>
        {p.slice(4, -5)}
      </em>
    ) : (
      p
    )
  );
}

/** Số tiền theo từng ngôn ngữ: "499.000đ" và "₫499,000". Dùng được cả Server lẫn Client Component. */
export function Tien({ so, className }: { so: number; className?: string }) {
  return <L values={tienSong(so)} className={className} />;
}

/** Trường dữ liệu có hậu tố ngôn ngữ (`ten`/`tenEn`/…); thiếu bản dịch thì dùng bản gốc. */
export function TL({
  obj,
  field,
  className,
}: {
  obj: Record<string, any> | null | undefined;
  field: string;
  className?: string;
}) {
  return (
    <>
      {LOCALES.map((l) => (
        <span key={l} data-l={l} className={className}>
          {layTruong(obj, field, l)}
        </span>
      ))}
    </>
  );
}

/** Nội dung đã có sẵn theo từng ngôn ngữ; ngôn ngữ thiếu rơi về ngôn ngữ gốc. */
export function L({
  values,
  className,
}: {
  values: Partial<Record<Locale, ReactNode>>;
  className?: string;
}) {
  return (
    <>
      {LOCALES.map((l) => (
        <span key={l} data-l={l} className={className}>
          {values[l] ?? values[DEFAULT_LOCALE]}
        </span>
      ))}
    </>
  );
}

/** Như `L` nhưng cho chuỗi HTML (bài blog, trang chính sách). Khối, không phải span. */
export function LHtml({
  values,
  className,
}: {
  values: Partial<Record<Locale, string>>;
  className?: string;
}) {
  return (
    <>
      {LOCALES.map((l) => (
        <div
          key={l}
          data-l={l}
          className={className}
          dangerouslySetInnerHTML={{ __html: values[l] ?? values[DEFAULT_LOCALE] ?? "" }}
        />
      ))}
    </>
  );
}

/** Như `L` nhưng bọc mỗi ngôn ngữ trong một khối `<div>` (đoạn văn, danh sách…). */
export function LBlock({
  values,
  className,
}: {
  values: Partial<Record<Locale, ReactNode>>;
  className?: string;
}) {
  return (
    <>
      {LOCALES.map((l) => (
        <div key={l} data-l={l} className={className}>
          {values[l] ?? values[DEFAULT_LOCALE]}
        </div>
      ))}
    </>
  );
}
