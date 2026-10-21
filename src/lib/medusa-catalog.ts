/**
 * Tầng đọc danh mục & sản phẩm từ Store API của Medusa — CHỈ CHẠY PHÍA SERVER.
 *
 * Vì sao có file này: bản trước gọi Store API từ `useEffect` trong Client
 * Component, dùng `process.env.CONFIG_API_MEDUSA_URL` — biến KHÔNG có tiền tố
 * NEXT_PUBLIC_ nên trong trình duyệt là `undefined`, rơi về `http://localhost:9000`.
 * Trình duyệt của khách gọi localhost của chính họ ⇒ luôn thất bại, trang luôn
 * hiện dữ liệu cứng. Ở đây mọi lời gọi nằm phía server nên không còn vấn đề đó.
 *
 * ⚠️ `CONFIG_PUBLISHABLE_KEY_MEDUSA` không mang tiền tố NEXT_PUBLIC_ — khoá chỉ nằm
 * phía server. Mỗi storefront dùng khoá riêng gắn với kênh bán của chính shop,
 * nhờ vậy Store API chỉ trả về sản phẩm của shop đó.
 *
 * ⚠️ TIỀN TỆ (ADR-010): VND zero-decimal. Số Medusa trả về đã là đồng, dùng
 * thẳng, KHÔNG chia 100.
 */

import "server-only";
import type { Locale } from "@/i18n/config";
import { cache as dedupeTrongMotLuotRender } from "react";
import { docMetadataCwWines, goiMedusa, TTL } from "./medusa";

/** Số sản phẩm mỗi trang danh mục. */
export const MOI_TRANG = 24;

/**
 * Thời gian sống của bộ nhớ đệm dữ liệu (giây) — TỐI ƯU 08/2026.
 *
 * Vì sao cần: bản trước gọi Store API với `cache: "no-store"` ở MỌI hàm, nên
 * mỗi lượt khách xem trang là một lượt Medusa phải truy vấn PostgreSQL lại từ
 * đầu. Với 7.869 sản phẩm và 233 danh mục, phần lớn công đó là làm lại y hệt
 * nhau — cây danh mục cả tháng không đổi một lần.
 *
 * Chọn TTL theo mức độ biến động của từng loại dữ liệu, KHÔNG dùng một con số
 * chung: danh mục gần như tĩnh, giá và tồn kho phải tươi.
 */
export interface DanhMuc {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  /** Danh mục con trực tiếp, chỉ có khi API được hỏi kèm. */
  con?: DanhMuc[];
}

export interface SanPhamMedusa {
  id: string;
  title: string;
  handle: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail: string | null;
  images: string[];
  /** Giá bán thật, đơn vị đồng. */
  gia: number;
  /** Giá gạch ngang — chỉ có khi site gốc thật sự đang giảm giá. */
  giaGoc: number | null;
  variantId: string | null;
  soBienThe: number;
  /**
   * Tồn kho THẬT của biến thể đầu, lấy từ Medusa.
   *
   * `null` = shop KHÔNG theo dõi tồn kho món này (`manage_inventory: false`),
   * tức bán bao nhiêu cũng được. Khác hẳn `0` = đã hết hàng. Đừng gộp hai cái.
   */
  tonKho?: number | null;
  tuyChon: { ten: string; giaTri: string[] }[];
  thuongHieu?: string | null;
  danhGia?: number | null;
  soDanhGia?: number | null;
  /** Mã hàng của biến thể đầu tiên. */
  sku?: string | null;
  /**
   * Id danh mục đầu tiên của sản phẩm — chỉ có khi lời gọi hỏi kèm
   * `*categories`. Nhờ trường này mà khối "sản phẩm gợi ý" ở trang chi tiết
   * không phải bắn thêm một lượt hỏi danh mục riêng.
   */
  danhMucId?: string | null;
  /**
   * Thuộc tính rượu do `seed-cwwines.ts` ghi vào `metadata.specs`: xuất xứ,
   * vùng trồng, giống nho, dung tích, nồng độ, nhóm hàng. Bóc từ tag Haravan
   * dạng `Country_Pháp`, `Grape_Merlot`, `Capacity_750ml` của site gốc.
   */
  specs?: Record<string, any>;
  descriptions?: Partial<Record<Locale, string>>;
}

/**
 * Gọi Store API của Medusa.
 *
 * `giaySong` là số giây giữ lại kết quả trong Data Cache của Next.js. Truyền 0
 * để buộc gọi mới hoàn toàn (dùng cho dữ liệu không được phép cũ). Bản trước
 * ghim cứng `no-store` nên KHÔNG có bất kỳ lớp đệm nào giữa storefront và
 * Medusa — mọi lượt xem trang đều đánh thẳng xuống PostgreSQL.
 */
async function goi<T = any>(
  duongDan: string,
  giaySong: number = TTL.DANH_SACH_SAN_PHAM
): Promise<T> {
  return goiMedusa<T>(duongDan, giaySong);
}

let regionDaCache: string | null = null;

/**
 * Region của shop. Cần cho Store API tính ra giá — thiếu nó thì giá về null.
 *
 * Hai lớp đệm chồng nhau: biến trong tiến trình (nhanh nhất, không tốn cả một
 * lượt fetch) và Data Cache của Next.js một giờ (dùng lại được sau khi tiến
 * trình khởi động lại). Bản trước dùng `force-cache` — cache VĨNH VIỄN, nghĩa
 * là đổi region trong Medusa thì storefront không bao giờ biết cho tới khi
 * dựng lại container.
 */
async function layRegionId(): Promise<string | null> {
  if (regionDaCache) return regionDaCache;
  try {
    const d = await goi<{ regions: Array<{ id: string }> }>(
      "/store/regions",
      TTL.REGION
    );
    regionDaCache = d.regions?.[0]?.id ?? null;
  } catch {
    regionDaCache = null;
  }
  return regionDaCache;
}

/**
 * Toàn bộ danh mục của shop ở dạng PHẲNG, chưa dựng quan hệ cha–con.
 *
 * TỐI ƯU 08/2026 — gộp một chỗ duy nhất. Trước đây `layCayDanhMuc` và
 * `layDanhMucKemConChau` mỗi hàm tự gọi CÙNG một endpoint `limit=1000` với
 * `no-store`. Trang danh mục gọi cả hai, cộng thêm `generateMetadata` gọi lại
 * lần nữa ⇒ MỘT lượt xem trang kéo về 233 danh mục ba lần liên tiếp.
 *
 * `dedupeTrongMotLuotRender` (React cache) gộp mọi lời gọi trùng nhau trong
 * cùng một lượt render thành một; `TTL.DANH_MUC` lo phần dùng lại giữa các
 * lượt xem của những khách khác nhau.
 */
const layDanhMucPhang = dedupeTrongMotLuotRender(
  async (): Promise<DanhMuc[]> => {
    try {
      const d = await goi<{ product_categories: any[] }>(
        "/store/product-categories?limit=1000&fields=id,name,handle,parent_category_id",
        TTL.DANH_MUC
      );
      return (d.product_categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        parent_category_id: c.parent_category_id ?? null,
      }));
    } catch {
      return [];
    }
  }
);

/**
 * Đổi một sản phẩm thô của Store API sang kiểu dùng trong giao diện.
 *
 * Giá lấy từ `calculated_price.calculated_amount` — KHÔNG phải
 * `variants[0].prices[0].amount`. Medusa v2 không trả `prices` ra Store API;
 * đọc nhầm chỗ đó là luôn nhận `undefined` rồi rơi về giá cứng, đúng lỗi khiến
 * web hiện 299.000đ trong khi CSDL ghi 499.000đ.
 */
function doiSangSanPham(p: any): SanPhamMedusa {
  const bienThe = Array.isArray(p.variants) ? p.variants : [];
  const dau = bienThe[0] ?? {};
  const tinh = dau.calculated_price ?? {};

  const gia = Number(tinh.calculated_amount ?? 0) || 0;
  const goc = Number(tinh.original_amount ?? 0) || 0;

  // ── Tồn kho THẬT từ Medusa ───────────────────────────────────────────────
  //
  // `null` nghĩa là "shop không theo dõi tồn kho món này" (manage_inventory =
  // false) — KHÁC hẳn với 0 nghĩa là "đã hết hàng". Gộp hai trường hợp là sai:
  // hàng không theo dõi kho sẽ bị coi là hết và không ai mua được.
  const theoDoiKho = dau.manage_inventory === true;
  const tonKho: number | null = theoDoiKho
    ? Number(dau.inventory_quantity ?? 0) || 0
    : null;

  const anh: string[] = Array.isArray(p.images)
    ? p.images.map((i: any) => i?.url).filter(Boolean)
    : [];

  const meta = p.metadata ?? {};
  const cw = docMetadataCwWines(meta);
  const giaGocMeta = Number(meta.gia_goc ?? 0) || 0;
  // Thuộc tính rượu nằm LỒNG trong `metadata.specs`, không phải ngay ở gốc
  // `metadata`. Đọc thẳng `meta.thuong_hieu` như bản Hasaki sẽ luôn ra null và
  // mọi thẻ sản phẩm mất tên nhà rượu mà không báo lỗi gì.
  const specs = cw.specs as Record<string, any>;

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    subtitle: p.subtitle ?? null,
    description: p.description ?? null,
    thumbnail: p.thumbnail ?? anh[0] ?? null,
    images: anh.length ? anh : p.thumbnail ? [p.thumbnail] : [],
    gia,
    // Ưu tiên giá gốc do Medusa tính; không có thì dùng giá niêm yết đã lưu lúc
    // cào. Chỉ hiện khi thật sự cao hơn giá bán — không bịa ra để giả vờ giảm giá.
    giaGoc: goc > gia ? goc : giaGocMeta > gia ? giaGocMeta : null,
    variantId: dau.id ?? null,
    soBienThe: bienThe.length,
    tonKho,
    tuyChon: Array.isArray(p.options)
      ? p.options.map((o: any) => ({
          ten: o.title ?? o.name ?? "",
          giaTri: Array.isArray(o.values)
            ? o.values.map((v: any) => v?.value ?? v).filter(Boolean)
            : [],
        }))
      : [],
    thuongHieu: (specs.thuong_hieu as string) ?? (meta.thuong_hieu as string) ?? null,
    danhGia: meta.danh_gia != null ? Number(meta.danh_gia) : null,
    soDanhGia: meta.so_danh_gia != null ? Number(meta.so_danh_gia) : null,
    sku: dau.sku ?? null,
    danhMucId: Array.isArray(p.categories) ? p.categories[0]?.id ?? null : null,
    specs,
    descriptions: cw.descriptions,
  };
}

// `*variants` (không chỉ `*variants.calculated_price`) là bắt buộc: thiếu nó
// thì Store API không trả `sku`, và mã hàng in trên thẻ sản phẩm — thứ site
// gốc luôn hiện ở dòng đầu — sẽ trống trơn.
// `+variants.inventory_quantity` — TỒN KHO THẬT (thêm 07/08/2026).
//
// Trước đây storefront BỊA tồn kho bằng cách băm `id` sản phẩm (`lib/ton-kho.ts`)
// vì CSDL không có bản ghi tồn kho nào — mọi biến thể đều `manage_inventory:false`.
// Ngày 07/08 đã chạy `nap-ton-kho.sql` cho shop này: 185 biến thể nay có
// `inventory_level` thật và đã bật theo dõi kho, nên đọc thẳng từ Medusa.
const TRUONG_SAN_PHAM =
  "*variants,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,*images,*options,*options.values,+metadata,+thumbnail,+subtitle";

/**
 * Toàn bộ danh mục của shop, đã dựng sẵn quan hệ cha–con.
 * Trả mảng danh mục GỐC; mỗi phần tử có `con` là danh mục con trực tiếp.
 */
export const layCayDanhMuc = dedupeTrongMotLuotRender(
  async (): Promise<DanhMuc[]> => {
    const nguon = await layDanhMucPhang();
    // Sao chép ra bản riêng: `layDanhMucPhang` được dùng chung nhiều nơi, gắn
    // thêm mảng `con` thẳng vào nó sẽ làm bẩn dữ liệu của các hàm khác.
    const phang: DanhMuc[] = nguon.map((c) => ({ ...c, con: [] }));

    const theoId = new Map(phang.map((c) => [c.id, c]));
    const goc: DanhMuc[] = [];
    for (const c of phang) {
      const cha = c.parent_category_id ? theoId.get(c.parent_category_id) : null;
      if (cha) cha.con!.push(c);
      else goc.push(c);
    }
    return goc;
  }
);

/**
 * Danh mục theo handle. Trả null nếu shop không có danh mục đó.
 *
 * Đọc từ danh sách phẳng đã có sẵn trong bộ đệm thay vì gọi thêm một lượt
 * Store API riêng — 233 danh mục lọc trong bộ nhớ nhanh hơn nhiều lần so với
 * một vòng đi–về qua mạng tới Medusa.
 */
export async function layDanhMuc(handle: string): Promise<DanhMuc | null> {
  const phang = await layDanhMucPhang();
  return phang.find((c) => c.handle === handle) ?? null;
}

/**
 * Danh mục theo handle, KÈM id của toàn bộ danh mục con cháu.
 *
 * Cần thiết vì sản phẩm chỉ được gắn vào danh mục LÁ. Nếu chỉ lọc theo đúng id
 * của danh mục đang xem thì mọi danh mục cha — trong đó có các mục trên menu
 * chính — đều hiện "0 sản phẩm".
 */
export const layDanhMucKemConChau = dedupeTrongMotLuotRender(
  async (
    handle: string
  ): Promise<{ danhMuc: DanhMuc; ids: string[] } | null> => {
    const phang = await layDanhMucPhang();
    if (phang.length === 0) return null;

    const goc = phang.find((c) => c.handle === handle);
    if (!goc) return null;

    // Gom con cháu theo chiều rộng.
    const conTheoCha = new Map<string, DanhMuc[]>();
    for (const c of phang) {
      if (!c.parent_category_id) continue;
      const ds = conTheoCha.get(c.parent_category_id) ?? [];
      ds.push(c);
      conTheoCha.set(c.parent_category_id, ds);
    }

    const ids: string[] = [];
    const hangDoi: DanhMuc[] = [goc];
    while (hangDoi.length > 0) {
      const c = hangDoi.shift()!;
      ids.push(c.id);
      for (const con of conTheoCha.get(c.id) ?? []) hangDoi.push(con);
    }

    return { danhMuc: goc, ids };
  }
);

/**
 * Sản phẩm thuộc một nhóm danh mục (danh mục đang xem + con cháu), có phân trang.
 *
 * `category_id` lọc ngay tại Medusa — KHÔNG tải hết rồi lọc bằng chuỗi ở
 * storefront như bản cũ (bản đó chỉ lấy 100 sản phẩm đầu của cả CSDL rồi so
 * tên, nên danh mục nào cũng ra cùng một danh sách).
 */
export async function laySanPhamTheoDanhMuc(
  idDanhMuc: string | string[],
  trang = 1,
  /**
   * Số sản phẩm mỗi trang. Trang danh mục dùng mặc định 24; các dải trên trang
   * chủ chỉ cần 10–15, và mỗi dải là một lượt gọi riêng — lấy dư rồi cắt ở
   * giao diện là kéo thừa vài trăm KB JSON cho mỗi lượt xem trang chủ.
   */
  moiTrang = MOI_TRANG
): Promise<{ sanPham: SanPhamMedusa[]; tong: number }> {
  const ids = Array.isArray(idDanhMuc) ? idDanhMuc : [idDanhMuc];
  if (ids.length === 0) return { sanPham: [], tong: 0 };

  const region = await layRegionId();
  const offset = Math.max(0, (trang - 1) * moiTrang);
  const thamSo = new URLSearchParams({
    limit: String(moiTrang),
    offset: String(offset),
    fields: TRUONG_SAN_PHAM,
  });
  for (const id of ids) thamSo.append("category_id[]", id);
  if (region) thamSo.set("region_id", region);

  try {
    const d = await goi<{ products: any[]; count: number }>(
      `/store/products?${thamSo.toString()}`,
      TTL.DANH_SACH_SAN_PHAM
    );
    return {
      sanPham: (d.products ?? []).map(doiSangSanPham),
      tong: d.count ?? 0,
    };
  } catch {
    return { sanPham: [], tong: 0 };
  }
}

/** Sản phẩm mới nhất của shop, dùng cho trang chủ. */
export const laySanPhamNoiBat = dedupeTrongMotLuotRender(
  async (soLuong = 12): Promise<SanPhamMedusa[]> => {
    const region = await layRegionId();
    const thamSo = new URLSearchParams({
      limit: String(soLuong),
      fields: TRUONG_SAN_PHAM,
      order: "-created_at",
    });
    if (region) thamSo.set("region_id", region);
    try {
      const d = await goi<{ products: any[] }>(
        `/store/products?${thamSo.toString()}`,
        TTL.DANH_SACH_SAN_PHAM
      );
      return (d.products ?? []).map(doiSangSanPham);
    } catch {
      return [];
    }
  }
);

/**
 * Một sản phẩm theo handle. Trả null nếu shop không bán sản phẩm đó.
 *
 * Lấy kèm `*categories` để nơi gọi không phải bắn thêm một lượt hỏi danh mục
 * nữa — chính lượt hỏi thừa đó là một nhánh của hình cây thác nước ở trang
 * chi tiết sản phẩm.
 */
export const laySanPhamTheoHandle = dedupeTrongMotLuotRender(
  async (handle: string): Promise<SanPhamMedusa | null> => {
    const region = await layRegionId();
    const thamSo = new URLSearchParams({
      handle,
      limit: "1",
      fields: `${TRUONG_SAN_PHAM},*categories`,
    });
    if (region) thamSo.set("region_id", region);
    try {
      const d = await goi<{ products: any[] }>(
        `/store/products?${thamSo.toString()}`,
        TTL.CHI_TIET_SAN_PHAM
      );
      const p = (d.products ?? [])[0];
      return p ? doiSangSanPham(p) : null;
    } catch {
      return null;
    }
  }
);

/** Vài sản phẩm khác cùng danh mục để gợi ý ở cuối trang chi tiết. */
export async function laySanPhamGoiY(
  idDanhMuc: string | string[] | null,
  boQuaHandle: string,
  soLuong = 4
): Promise<SanPhamMedusa[]> {
  const ds = idDanhMuc
    ? (await laySanPhamTheoDanhMuc(idDanhMuc, 1)).sanPham
    : await laySanPhamNoiBat(soLuong + 4);
  return ds.filter((p) => p.handle !== boQuaHandle).slice(0, soLuong);
}

/** Danh mục của một sản phẩm (dùng cho breadcrumb và gợi ý). */
export const layDanhMucCuaSanPham = dedupeTrongMotLuotRender(
  async (handle: string): Promise<DanhMuc | null> => {
    try {
      const d = await goi<{ products: any[] }>(
        `/store/products?handle=${encodeURIComponent(
          handle
        )}&limit=1&fields=*categories`,
        TTL.CHI_TIET_SAN_PHAM
      );
      const c = (d.products ?? [])[0]?.categories?.[0];
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        handle: c.handle,
        parent_category_id: c.parent_category_id ?? null,
      };
    } catch {
      return null;
    }
  }
);

/** Định dạng tiền: re-export từ `lib/tien` (có theo ngôn ngữ). */
export { dinhDangTien } from "@/lib/tien";

/** % giảm giá làm tròn, hoặc null nếu không giảm. */
export function phanTramGiam(p: SanPhamMedusa): number | null {
  if (!p.giaGoc || p.giaGoc <= p.gia) return null;
  return Math.round((1 - p.gia / p.giaGoc) * 100);
}
