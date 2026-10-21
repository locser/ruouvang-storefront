/**
 * BỘ LỌC & SẮP XẾP CHO TRANG DANH MỤC — CHỈ CHẠY PHÍA SERVER.
 *
 * SỬA BUG-R06 (báo cáo kiểm thử 05/08/2026):
 *
 *   "Trang danh mục rất lớn không có phần tử <select>
 *    nào và không có bất kỳ khối bộ lọc hay sắp xếp nào. Khách chỉ có thể bấm
 *    'Xem thêm sản phẩm' liên tục — cần bấm khoảng 43 lần để xem hết."
 *
 * VÌ SAO ĐI QUA MEILISEARCH CHỨ KHÔNG QUA STORE API CỦA MEDUSA:
 *
 *   · Medusa v2 để giá ở `variants[].calculated_price`, tính lúc đọc theo
 *     region — Store API KHÔNG sắp xếp được theo giá. Sắp xếp trên 24 sản phẩm
 *     đã tải về thì chỉ đúng trong một trang, sai với 2.096 sản phẩm.
 *   · Thuộc tính rượu (quốc gia, vùng trồng, giống nho, dung tích) nằm trong
 *     `metadata.specs` — Store API không lọc được theo trường lồng trong JSON.
 *   · Meilisearch đã có sẵn cả ba thứ cần: `price_vnd` sắp xếp được,
 *     `category_path` lọc được, và các khoá `specs.*` vừa được khai báo trong
 *     `apps/backend/src/scripts/sync-meili.ts`.
 *
 * ⚠️ PHẢI CHẠY LẠI `sync-meili.ts` trước khi triển khai, nếu không Meilisearch
 * trả 400 cho các trường `specs.*`. Hàm dưới đây đã lường trước: mọi lỗi đều
 * trả `null` để trang danh mục rơi về danh sách Medusa như cũ — mất bộ lọc chứ
 * không mất trang.
 *
 * ⚠️ Cách ly tenant: `tenant_id` LUÔN là điều kiện lọc đầu tiên (ADR-011).
 */

import "server-only";
import { sanPhamBanDuoc } from "./san-pham-ban-duoc";

const HOST = process.env.CONFIG_MEILI_HOST || "http://meilisearch:7700";
const KEY = process.env.CONFIG_MEILI_MASTER_KEY || "";
const INDEX = process.env.CONFIG_MEILI_INDEX || "products";
const TENANT_ID = process.env.CONFIG_TENANT_ID ?? "";

/** Số sản phẩm mỗi trang khi có bộ lọc — giữ bằng trang danh mục thường. */
export const MOI_TRANG_LOC = 24;

/** Các kiểu sắp xếp cho khách chọn. `giaTri` là biểu thức sort của Meilisearch. */
export const KIEU_SAP_XEP = [
  { ma: "lien-quan", ten: "Mặc định", tenEn: "Default", giaTri: null },
  { ma: "gia-tang", ten: "Giá thấp đến cao", tenEn: "Price: low to high", giaTri: "price_vnd:asc" },
  { ma: "gia-giam", ten: "Giá cao đến thấp", tenEn: "Price: high to low", giaTri: "price_vnd:desc" },
  { ma: "moi-nhat", ten: "Mới cập nhật", tenEn: "Recently updated", giaTri: "updated_at:desc" },
  { ma: "ban-chay", ten: "Được quan tâm nhất", tenEn: "Most popular", giaTri: "popularity:desc" },
] as const;

export type MaSapXep = (typeof KIEU_SAP_XEP)[number]["ma"];

/**
 * Các khoảng giá cho khách chọn, đơn vị đồng.
 *
 * Mốc chọn theo phân khúc thật của ngành rượu tại Việt Nam: dưới 500K là vang
 * uống hằng ngày, 500K–1TR là vang tiếp khách, 1–3TR là vang biếu tặng, trên
 * 3TR là Grand Cru và rượu sưu tầm.
 */
export const KHOANG_GIA = [
  { ma: "duoi-500k", ten: "Dưới 500.000đ", tenEn: "Under 500,000đ", tu: 0, den: 500_000 },
  { ma: "500k-1tr", ten: "500.000đ – 1 triệu", tenEn: "500,000đ – 1 million", tu: 500_000, den: 1_000_000 },
  { ma: "1tr-3tr", ten: "1 – 3 triệu", tenEn: "1 – 3 million", tu: 1_000_000, den: 3_000_000 },
  { ma: "3tr-10tr", ten: "3 – 10 triệu", tenEn: "3 – 10 million", tu: 3_000_000, den: 10_000_000 },
  { ma: "tren-10tr", ten: "Trên 10 triệu", tenEn: "Over 10 million", tu: 10_000_000, den: null },
] as const;

/** Bốn nhóm thuộc tính rượu được phép lọc, kèm nhãn tiếng Việt hiện trên giao diện. */
export const NHOM_LOC = [
  { ma: "quoc-gia", truong: "specs.xuat_xu", ten: "Quốc gia", tenEn: "Country" },
  { ma: "vung-trong", truong: "specs.vung_trong", ten: "Vùng trồng", tenEn: "Region" },
  { ma: "giong-nho", truong: "specs.giong_nho", ten: "Giống nho", tenEn: "Grape" },
  { ma: "dung-tich", truong: "specs.dung_tich", ten: "Dung tích", tenEn: "Volume" },
] as const;

export type MaNhomLoc = (typeof NHOM_LOC)[number]["ma"];

export interface LuaChonLoc {
  /** Handle danh mục đang xem — khớp chính xác một phần tử của `category_path`. */
  handleDanhMuc: string;
  trang: number;
  sapXep: MaSapXep;
  khoangGia: string | null;
  /** Giá trị đang chọn của từng nhóm lọc, ví dụ `{ "quoc-gia": "Pháp" }`. */
  thuocTinh: Partial<Record<MaNhomLoc, string>>;
}

export interface SanPhamLoc {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  gia: number;
  giaGoc: number | null;
  /**
   * Tồn kho lấy từ chỉ mục Meilisearch (`stock_qty`), đồng bộ bởi
   * `apps/backend/src/lib/meili-sync.ts`.
   *
   * ⚠️ Số này CŨ hơn Medusa — chỉ mục chỉ cập nhật khi chạy `sync-meili`.
   * Dùng để hiện nhãn "còn N" trên lưới thì được; TRƯỚC KHI CHỐT ĐƠN vẫn phải
   * đọc lại từ Medusa (quy tắc §6.4 ADMIN_GUIDE).
   */
  tonKho?: number | null;
  loai?: string;
  tags?: string[];
}

export interface GiaTriLoc {
  giaTri: string;
  soLuong: number;
}

export interface KetQuaLoc {
  sanPham: SanPhamLoc[];
  tong: number;
  /** Giá trị khả dụng của từng nhóm lọc, kèm số sản phẩm — lấy từ facet. */
  facet: Record<MaNhomLoc, GiaTriLoc[]>;
}

/** Bọc giá trị vào dấu nháy kép và thoát ký tự, tránh làm hỏng biểu thức lọc. */
function nhay(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Dựng biểu thức `filter` của Meilisearch.
 * `tenant_id` luôn đứng đầu — đây là hàng rào cách ly dữ liệu, không phải tối ưu.
 */
export function dungBoLoc(lc: LuaChonLoc): string[] {
  const dk: string[] = [`tenant_id = ${nhay(TENANT_ID)}`];

  if (lc.handleDanhMuc) {
    dk.push(`category_path = ${nhay(lc.handleDanhMuc)}`);
  }

  const khoang = KHOANG_GIA.find((k) => k.ma === lc.khoangGia);
  if (khoang) {
    dk.push(`price_vnd >= ${khoang.tu}`);
    if (khoang.den !== null) dk.push(`price_vnd < ${khoang.den}`);
  }

  for (const nhom of NHOM_LOC) {
    const gt = lc.thuocTinh[nhom.ma];
    if (gt) dk.push(`${nhom.truong} = ${nhay(gt)}`);
  }

  return dk;
}

/**
 * Lọc & sắp xếp sản phẩm trong một danh mục.
 *
 * Trả `null` khi chưa cấu hình Meilisearch hoặc khi truy vấn lỗi — nơi gọi phải
 * rơi về danh sách Medusa thường. KHÔNG bao giờ ném lỗi lên giao diện: mất bộ
 * lọc còn hơn mất cả trang danh mục.
 */
export async function locSanPham(lc: LuaChonLoc): Promise<KetQuaLoc | null> {
  if (!KEY || !TENANT_ID) return null;

  const sap = KIEU_SAP_XEP.find((s) => s.ma === lc.sapXep)?.giaTri ?? null;
  const than: Record<string, unknown> = {
    q: "",
    filter: dungBoLoc(lc),
    limit: MOI_TRANG_LOC,
    offset: Math.max(0, (lc.trang - 1) * MOI_TRANG_LOC),
    facets: NHOM_LOC.map((n) => n.truong),
  };
  if (sap) than.sort = [sap];

  const ac = new AbortController();
  const hetGio = setTimeout(() => ac.abort(), 5000);

  try {
    let d: any;
    const res = await fetch(`${HOST}/indexes/${INDEX}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(than),
      next: { revalidate: 60 },
      signal: ac.signal,
    });

    if (!res.ok) {
      // 400 ở đây gần như luôn là "thuộc tính chưa khai filterable/sortable" —
      // dấu hiệu `sync-meili.ts` chưa được chạy lại sau khi triển khai.
      console.error(
        `[loc-danh-muc] Meilisearch ${res.status}: ${(await res.text()).slice(0, 300)}`
      );
      return null;
    }

    d = await res.json();

    const phanBo = (d.facetDistribution ?? {}) as Record<
      string,
      Record<string, number>
    >;
    const facet = {} as Record<MaNhomLoc, GiaTriLoc[]>;
    for (const nhom of NHOM_LOC) {
      const bang = phanBo[nhom.truong] ?? {};
      facet[nhom.ma] = Object.entries(bang)
        .map(([giaTri, soLuong]) => ({ giaTri, soLuong: Number(soLuong) || 0 }))
        .filter((x) => x.giaTri.trim() !== "")
        // Nhiều giá trị nhất lên trước; bằng nhau thì xếp theo bảng chữ cái Việt.
        .sort((a, b) => b.soLuong - a.soLuong || a.giaTri.localeCompare(b.giaTri, "vi"))
        .slice(0, 12);
    }

    return {
      sanPham: (d.hits ?? [])
        .map((h: any) => ({
          id: String(h.id),
          title: h.title ?? "",
          handle: h.handle ?? "",
          thumbnail: h.thumbnail || null,
          gia: Number(h.price_vnd) || 0,
          // Index không giữ giá gạch ngang; thẻ sản phẩm sẽ chỉ hiện giá bán.
          giaGoc: null,
          // `in_stock: false` + `stock_qty: 0` là dấu hiệu chỉ mục CHƯA đồng bộ
          // lại sau khi nạp tồn kho — trả `null` để không hiện nhầm "hết hàng".
          tonKho: h.in_stock === true ? Number(h.stock_qty ?? 0) || 0 : null,
          loai: typeof h.specs?.loai === "string" ? h.specs.loai : "",
          tags: Array.isArray(h.tags) ? h.tags.filter((t: unknown) => typeof t === "string") : [],
        }))
        .filter((sp: SanPhamLoc) => sanPhamBanDuoc({ gia: sp.gia })),
      tong: Number(d.estimatedTotalHits ?? 0) || 0,
      facet,
    };
  } catch (e) {
    console.error("[loc-danh-muc] locSanPham lỗi:", e);
    return null;
  } finally {
    clearTimeout(hetGio);
  }
}

/** Có bộ lọc hoặc sắp xếp nào đang bật không — dùng để chọn nhánh hiển thị. */
export function coDangLoc(lc: LuaChonLoc): boolean {
  return (
    !!lc.khoangGia ||
    lc.sapXep !== "lien-quan" ||
    NHOM_LOC.some((n) => !!lc.thuocTinh[n.ma])
  );
}
