import type { Locale } from "@/i18n/config";
import type { SanPhamMedusa } from "./medusa-catalog";
import type { SanPhamTim } from "./meili";

/**
 * Kiểu sản phẩm dùng ở tầng giao diện và trong giỏ hàng.
 *
 * ⚠️ KHÔNG có danh sách sản phẩm mẫu trong file này.
 *
 * Bản chép từ storefront Hasaki mang theo `HASAKI_PRODUCTS` — 30 sản phẩm cứng
 * dùng làm hàng dự phòng khi backend không phản hồi. Với C.W. Wines thì cách đó
 * còn tệ hơn là để trang trống: khách sẽ thấy một trang bán rượu đang chào bán
 * kem chống nắng, mà không dấu hiệu nào cho biết đó là dữ liệu giả. Backend
 * chết thì phải nhìn ra là chết.
 *
 * Nguồn dữ liệu duy nhất là Medusa (`medusa-catalog.ts`).
 */
export interface Product {
  /**
   * Tồn kho THẬT lấy từ Medusa (thêm 07/08/2026, thay cho số bịa trong
   * `lib/ton-kho.ts`).
   *
   * `null`/`undefined` = shop không theo dõi tồn kho món này → bán không giới
   * hạn. `0` = đã hết hàng. Hai trường hợp này KHÁC nhau, đừng gộp.
   */
  tonKho?: number | null;
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  /** Mô tả theo ngôn ngữ; ngôn ngữ thiếu rơi về `description`. */
  descriptions?: Partial<Record<Locale, string>>;
  /** Giá bán, đơn vị đồng (VND zero-decimal — 3440000 là 3.440.000đ). */
  price: number;
  originalPrice?: number;
  handle: string;
  sku: string;
  thumbnail: string;
  images?: string[];
  /** Nhà sản xuất — với rượu vang đây là tên château / nhà rượu. */
  brand?: string;
  /** Quốc gia xuất xứ, bóc từ tag `Country_…` của site gốc. */
  origin?: string;
  /** Vùng trồng, bóc từ tag `Region_…`. */
  region?: string;
  /** Giống nho, bóc từ tag `Grape_…`. */
  grape?: string;
  /** Dung tích chai, bóc từ tag `Capacity_…` (thường "750ml"). */
  volume?: string;
  /** Nồng độ cồn, bóc từ tag `Abv_…`. */
  abv?: string;
  /** Loại rượu — "Rượu vang đỏ", "Champagne"… */
  category?: string;
  /** Tag của sản phẩm (giống nho, dòng rượu, "Best Seller"…) — nguồn cho nhãn và hương vị. */
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  longDescription?: string[];
}

/**
 * `SanPhamMedusa` → `Product`.
 *
 * Thuộc tính rượu (xuất xứ, vùng, giống nho, dung tích, nồng độ) nằm trong
 * `metadata.specs` do `seed-cwwines.ts` ghi vào, bóc ra từ tag Haravan dạng
 * `Country_Pháp`, `Grape_Merlot`, `Capacity_750ml`.
 */
export function doiSangProduct(p: SanPhamMedusa): Product {
  const specs = (p as any).specs ?? {};
  const giongNho = Array.isArray(specs.giong_nho)
    ? specs.giong_nho.join(", ")
    : specs.giong_nho ?? undefined;

  return {
    tonKho: p.tonKho ?? null,
    id: p.id,
    title: p.title,
    subtitle: p.subtitle ?? undefined,
    description: p.description || "",
    descriptions: p.descriptions,
    price: p.gia,
    originalPrice: p.giaGoc ?? undefined,
    handle: p.handle,
    sku: p.sku || "",
    thumbnail: p.thumbnail || p.images?.[0] || "",
    images: p.images ?? [],
    brand: p.thuongHieu || specs.thuong_hieu || undefined,
    origin: specs.xuat_xu ?? undefined,
    region: specs.vung_trong ?? undefined,
    grape: giongNho || undefined,
    volume: specs.dung_tich ?? undefined,
    abv: specs.nong_do ?? undefined,
    category: specs.loai ?? undefined,
    tags: Array.isArray(specs.tags) ? specs.tags : undefined,
    rating: p.danhGia ?? undefined,
    reviewCount: p.soDanhGia ?? undefined,
  };
}

/** Bản ghi phẳng Meilisearch → thẻ sản phẩm dùng ở các danh sách chỉ để xem. */
export function doiTimSangProduct(p: SanPhamTim): Product {
  return {
    tonKho: null,
    id: p.id,
    title: p.title,
    description: "",
    price: p.price_vnd,
    handle: p.handle,
    sku: p.sku,
    thumbnail: p.thumbnail,
    images: p.thumbnail ? [p.thumbnail] : [],
    brand: p.brand || undefined,
    category: p.loai || undefined,
    tags: p.tags,
  };
}
