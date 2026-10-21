/**
 * Tầng tìm kiếm Meilisearch — CHỈ CHẠY PHÍA SERVER.
 *
 * ⚠️ KHÔNG BAO GIỜ import file này vào Client Component. `CONFIG_MEILI_MASTER_KEY` có
 * toàn quyền đọc/ghi/xoá dữ liệu của MỌI shop. Trình duyệt phải đi qua route
 * `/api/goi-y`, không gọi thẳng Meilisearch.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VÌ SAO ĐỌC SẢN PHẨM QUA ĐÂY CHỨ KHÔNG QUA STORE API
 *
 * Đo thật ngày 07/08/2026 trên shop C.W. Wines (185 sản phẩm):
 *
 *   GET /store/products?limit=15   (Medusa)        18.000 – 27.387 ms
 *   POST /indexes/products/search  (Meilisearch)         3 –      48 ms
 *
 * Chênh lệch hơn 500 lần. Store API của Medusa v2 phải tính giá tự động
 * (`calculated_price`) và join `product` × `variant` × `price` × `option` ×
 * `category` × `sales_channel` cho từng lượt gọi. Meilisearch đã có sẵn bảng
 * phẳng, chỉ việc lọc.
 *
 * Dùng Store API cho: giỏ hàng, đặt hàng, giá lúc thanh toán (phải chính xác
 * tuyệt đối). Dùng Meilisearch cho: mọi danh sách chỉ để KHÁCH XEM.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cách ly tenant: `tenant_id` LUÔN là điều kiện lọc đầu tiên (ADR-011).
 * Storefront này phục vụ đúng một shop, xác định bằng biến `CONFIG_TENANT_ID`.
 *
 * ⚠️ TIỀN TỆ (ADR-010): `price_vnd` đã là đồng. Dùng thẳng, KHÔNG chia 100.
 */

import "server-only";
import { sanPhamBanDuoc } from "./san-pham-ban-duoc";

const HOST = process.env.CONFIG_MEILI_HOST || "http://meilisearch:7700";
const KEY = process.env.CONFIG_MEILI_MASTER_KEY || "";
const INDEX = process.env.CONFIG_MEILI_INDEX || "products";
const TENANT_ID = process.env.CONFIG_TENANT_ID ?? "";

/** Số kết quả mỗi trang ở trang /tim-kiem. */
export const MOI_TRANG = 24;

/** Hết giờ cho một lượt tìm. Meilisearch trả trong vài chục ms; quá 5 giây là hỏng. */
const HET_GIO_MS = 5000;
const TTL_DANH_SACH = 60;

export interface SanPhamTim {
  id: string;
  title: string;
  handle: string;
  sku: string;
  price_vnd: number;
  thumbnail: string;
  brand: string;
  category_path: string[];
  /** Loại rượu (`specs.loai`): "Red Wine", "Sparkling"… */
  loai: string;
  tags: string[];
}

export interface KetQuaTim {
  sanPham: SanPhamTim[];
  tong: number;
}

/**
 * Bộ lọc bắt buộc. Luôn bắt đầu bằng tenant_id.
 *
 * ⚠️ KHÔNG lọc theo `in_stock`. Sản phẩm cào về thường được nạp với
 * `manage_inventory: false` nên KHÔNG có bản ghi tồn kho, và Meilisearch nhận
 * `in_stock: false` cho TẤT CẢ. Thêm điều kiện tồn kho vào đây là mọi tìm kiếm
 * trả về 0 kết quả — đã dính đúng lỗi này một lần, cả catalog báo "hết hàng".
 */
function boLoc(them?: string[]): string {
  const dk = [`tenant_id = "${TENANT_ID}"`, ...(them ?? [])];
  return dk.join(" AND ");
}

async function goiMeili<T = any>(duongDan: string, than: unknown): Promise<T> {
  if (!KEY || !TENANT_ID) {
    throw new Error(
      "[meili] Thiếu CONFIG_MEILI_MASTER_KEY hoặc CONFIG_TENANT_ID — chưa cấu hình tìm kiếm."
    );
  }
  const ac = new AbortController();
  const hetGio = setTimeout(() => ac.abort(), HET_GIO_MS);
  try {
    const res = await fetch(`${HOST}${duongDan}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(than),
      next: { revalidate: TTL_DANH_SACH },
      signal: ac.signal,
    });
    if (!res.ok) {
      throw new Error(`Meilisearch ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(hetGio);
  }
}

function doiSang(h: any): SanPhamTim {
  return {
    id: h.id,
    title: h.title ?? "",
    handle: h.handle ?? "",
    sku: h.sku ?? "",
    price_vnd: Number(h.price_vnd ?? 0) || 0,
    thumbnail: h.thumbnail ?? "",
    brand: h.brand ?? "",
    category_path: Array.isArray(h.category_path) ? h.category_path : [],
    loai: typeof h.specs?.loai === "string" ? h.specs.loai : "",
    tags: Array.isArray(h.tags) ? h.tags.filter((t: unknown) => typeof t === "string") : [],
  };
}

/** Tìm sản phẩm, có phân trang. Lỗi Meilisearch → trả rỗng, KHÔNG ném lên UI. */
export async function timSanPham(tuKhoa: string, trang = 1): Promise<KetQuaTim> {
  const q = (tuKhoa || "").trim();
  if (!q) return { sanPham: [], tong: 0 };

  try {
    const d = await goiMeili<{ hits: any[]; estimatedTotalHits: number }>(
      `/indexes/${INDEX}/search`,
      {
        q,
        filter: boLoc(),
        limit: MOI_TRANG,
        offset: Math.max(0, (trang - 1) * MOI_TRANG),
      }
    );
    return {
      sanPham: (d.hits ?? [])
        .map(doiSang)
        .filter((sp) => sanPhamBanDuoc({ priceVnd: sp.price_vnd })),
      tong: d.estimatedTotalHits ?? 0,
    };
  } catch (e) {
    console.error("[meili] timSanPham lỗi:", e);
    return { sanPham: [], tong: 0 };
  }
}

/**
 * Danh sách sản phẩm theo danh mục — THAY CHO `/store/products`.
 *
 * Đây là hàm đổi 25 giây thành 50 mili-giây. Trang chủ và trang danh mục nên
 * gọi hàm này; chỉ trang chi tiết sản phẩm mới cần Store API để lấy giá chuẩn.
 *
 * `duongDanDanhMuc` khớp với trường `category_path` do `sync-meili.ts` ghi vào
 * chỉ mục. Bỏ trống thì lấy toàn shop (dùng cho dải "mới về", "bán chạy").
 */
export async function laySanPhamTheoDanhMuc(
  duongDanDanhMuc?: string,
  soLuong = MOI_TRANG,
  bo = 0
): Promise<KetQuaTim> {
  try {
    const them = duongDanDanhMuc
      ? [`category_path = "${duongDanDanhMuc}"`]
      : undefined;
    const d = await goiMeili<{ hits: any[]; estimatedTotalHits: number }>(
      `/indexes/${INDEX}/search`,
      { q: "", filter: boLoc(them), limit: soLuong, offset: bo }
    );
    return {
      sanPham: (d.hits ?? [])
        .map(doiSang)
        .filter((sp) => sanPhamBanDuoc({ priceVnd: sp.price_vnd })),
      tong: d.estimatedTotalHits ?? 0,
    };
  } catch (e) {
    console.error("[meili] laySanPhamTheoDanhMuc lỗi:", e);
    return { sanPham: [], tong: 0 };
  }
}

/** Gợi ý gõ tới đâu hiện tới đó. Ít kết quả, ưu tiên nhanh. */
export async function goiY(tuKhoa: string, soLuong = 6): Promise<SanPhamTim[]> {
  const q = (tuKhoa || "").trim();
  if (q.length < 2) return [];

  try {
    const d = await goiMeili<{ hits: any[] }>(`/indexes/${INDEX}/search`, {
      q,
      filter: boLoc(),
      limit: soLuong,
    });
    return (d.hits ?? [])
      .map(doiSang)
      .filter((sp) => sanPhamBanDuoc({ priceVnd: sp.price_vnd }));
  } catch (e) {
    console.error("[meili] goiY lỗi:", e);
    return [];
  }
}

/**
 * Số sản phẩm đang bán của từng bộ sưu tập, một lượt gọi duy nhất (facet theo
 * `category_path`, khoá là HANDLE bộ sưu tập). Lỗi → `null`: trang danh mục vẫn hiện,
 * chỉ thiếu con số.
 */
export async function demSanPhamTheoDanhMuc(): Promise<Record<string, number> | null> {
  try {
    const d = await goiMeili<{ facetDistribution?: Record<string, Record<string, number>> }>(
      `/indexes/${INDEX}/search`,
      { q: "", filter: boLoc(), limit: 0, facets: ["category_path"] }
    );
    return d.facetDistribution?.category_path ?? null;
  } catch (e) {
    console.error("[meili] demSanPhamTheoDanhMuc lỗi:", e);
    return null;
  }
}
