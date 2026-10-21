import Link from "next/link";
import NgacLoc from "./NgacLoc";
import T, { TL } from "./T";
import {
  KHOANG_GIA,
  KIEU_SAP_XEP,
  NHOM_LOC,
  type GiaTriLoc,
  type LuaChonLoc,
  type MaNhomLoc,
} from "@/lib/loc-danh-muc";

/**
 * Thanh bộ lọc và sắp xếp của trang danh mục — SỬA BUG-R06.
 *
 * Cố ý làm bằng LIÊN KẾT chứ không bằng `<select>` + JavaScript:
 *
 *   · mỗi tổ hợp lọc là một địa chỉ riêng, chia sẻ được và quay lại được bằng
 *     nút Back của trình duyệt;
 *   · hoạt động ngay cả khi React chưa hydrate xong — chính khoảng chết đó là
 *     nguyên nhân của BUG-R07 (Enter ở ô tìm kiếm không ăn ngay sau khi tải);
 *   · bộ máy tìm kiếm đi theo được, nên các trang lọc phổ biến (vang đỏ Pháp,
 *     vang dưới 500K) cũng lên được kết quả tra cứu.
 */

/** Dựng lại đường dẫn với một tham số được đổi; bỏ tham số khi giá trị rỗng. */
function duongDan(
  handle: string,
  lc: LuaChonLoc,
  doi: Partial<Record<string, string | null>>
): string {
  const ts = new URLSearchParams();

  if (lc.sapXep !== "lien-quan") ts.set("sap", lc.sapXep);
  if (lc.khoangGia) ts.set("gia", lc.khoangGia);
  for (const nhom of NHOM_LOC) {
    const gt = lc.thuocTinh[nhom.ma];
    if (gt) ts.set(nhom.ma, gt);
  }

  for (const [khoa, gt] of Object.entries(doi)) {
    // `Partial<Record<...>>` nên giá trị có thể là `undefined`, không chỉ `null`.
    // Thiếu nhánh đó thì `ts.set(khoa, undefined)` không qua được TypeScript,
    // và nếu ép kiểu cho qua thì URL sinh ra chuỗi "undefined" — bộ lọc im lặng
    // trả về 0 sản phẩm.
    if (gt === null || gt === undefined || gt === "") ts.delete(khoa);
    else ts.set(khoa, gt);
  }

  // Đổi bộ lọc là phải về trang 1, nếu không khách rơi vào trang trống.
  ts.delete("trang");

  const chuoi = ts.toString();
  return chuoi ? `/danh-muc/${handle}?${chuoi}` : `/danh-muc/${handle}`;
}

export default function ThanhLocDanhMuc({
  handle,
  luaChon,
  facet,
  tong,
}: {
  handle: string;
  luaChon: LuaChonLoc;
  facet: Record<MaNhomLoc, GiaTriLoc[]>;
  tong: number;
}) {
  const dangLoc =
    !!luaChon.khoangGia || NHOM_LOC.some((n) => !!luaChon.thuocTinh[n.ma]);

  const soLoc =
    (luaChon.khoangGia ? 1 : 0) + NHOM_LOC.filter((n) => !!luaChon.thuocTinh[n.ma]).length;
  const kieuSapXep = KIEU_SAP_XEP.find((k) => k.ma === luaChon.sapXep);
  const tenSapXep = kieuSapXep ? <TL obj={kieuSapXep} field="ten" /> : null;

  return (
    <NgacLoc soLoc={soLoc} tong={tong} tenSapXep={tenSapXep}>
      <div>
      {/* ── Sắp xếp ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line py-4">
        <span className="mb-1 w-full shrink-0 text-[11px] font-medium uppercase tracking-caps text-copper-ink md:mb-0 md:mr-3 md:w-28">
          <T k="filter.sort_by" />
        </span>
        {KIEU_SAP_XEP.map((s) => {
          const dangChon = luaChon.sapXep === s.ma;
          return (
            <Link
              key={s.ma}
              href={duongDan(handle, luaChon, {
                sap: s.ma === "lien-quan" ? null : s.ma,
              })}
              aria-current={dangChon ? "true" : undefined}
              className={`inline-flex min-h-[38px] items-center border px-4 py-1.5 text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                dangChon
                  ? "border-wine bg-wine text-page"
                  : "border-ink/20 text-ink-muted hover:border-wine hover:text-wine"
              }`}
            >
              <TL obj={s} field="ten" />
            </Link>
          );
        })}
      </div>

      {/* ── Khoảng giá ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line py-4">
        <span className="mb-1 w-full shrink-0 text-[11px] font-medium uppercase tracking-caps text-copper-ink md:mb-0 md:mr-3 md:w-28">
          <T k="filter.price_range" />
        </span>
        {KHOANG_GIA.map((k) => {
          const dangChon = luaChon.khoangGia === k.ma;
          return (
            <Link
              key={k.ma}
              href={duongDan(handle, luaChon, { gia: dangChon ? null : k.ma })}
              aria-current={dangChon ? "true" : undefined}
              className={`inline-flex min-h-[38px] items-center border px-4 py-1.5 text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                dangChon
                  ? "border-wine bg-wine text-page"
                  : "border-ink/20 text-ink-muted hover:border-wine hover:text-wine"
              }`}
            >
              <TL obj={k} field="ten" />
            </Link>
          );
        })}
      </div>

      {/* ── Thuộc tính rượu (quốc gia, vùng trồng, giống nho, dung tích) ─── */}
      {NHOM_LOC.map((nhom) => {
        const ds = facet[nhom.ma] ?? [];
        if (ds.length === 0) return null;
        const dangChon = luaChon.thuocTinh[nhom.ma];

        return (
          <div
            key={nhom.ma}
            className="flex flex-wrap items-center gap-2 border-b border-line py-4"
          >
            <span className="mb-1 w-full shrink-0 text-[11px] font-medium uppercase tracking-caps text-copper-ink md:mb-0 md:mr-3 md:w-28">
              <TL obj={nhom} field="ten" />
            </span>
            {ds.map((v) => {
              const chon = dangChon === v.giaTri;
              return (
                <Link
                  key={`${nhom.ma}-${v.giaTri}`}
                  href={duongDan(handle, luaChon, {
                    [nhom.ma]: chon ? null : v.giaTri,
                  })}
                  aria-current={chon ? "true" : undefined}
                  className={`inline-flex min-h-[38px] items-center border px-4 py-1.5 text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                    chon
                      ? "border-wine bg-wine text-page"
                      : "border-ink/20 text-ink-muted hover:border-wine hover:text-wine"
                  }`}
                >
                  {v.giaTri}
                  <span className={chon ? "text-page/70" : "text-ink-soft"}>
                    {" "}
                    ({v.soLuong.toLocaleString("vi-VN")})
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}

      {/* ── Dòng kết quả + xoá lọc ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <span className="text-[13px] text-ink-muted">
          {tong.toLocaleString("vi-VN")} <T k="filter.matching_products" />
        </span>
        {dangLoc && (
          <Link
            href={`/danh-muc/${handle}`}
            className="lien-ket text-[11px] font-medium uppercase tracking-[0.16em] text-wine"
          >
            <T k="filter.clear_all_filters" />
          </Link>
        )}
      </div>
      </div>
    </NgacLoc>
  );
}
