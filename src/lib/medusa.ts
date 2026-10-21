/**
 * Tầng đọc danh mục & sản phẩm từ Store API của Medusa — CHỈ CHẠY PHÍA SERVER.
 *
 * Đây là bản MẪU, đúc từ `storefront-cwwines` và `storefront-hasaki` sau đợt
 * tối ưu 07/08/2026. Chép sang `apps/storefront-<ten>/src/lib/` rồi sửa phần
 * ánh xạ dữ liệu cho hợp shop; phần khung gồm đệm, hết giờ và chịu lỗi dùng chung.
 *
 * ⚠️ `CONFIG_PUBLISHABLE_KEY_MEDUSA` KHÔNG mang tiền tố NEXT_PUBLIC_ — khoá chỉ nằm
 * phía server. Mỗi storefront dùng khoá RIÊNG gắn với kênh bán của chính shop;
 * dùng chung khoá là hai shop nhìn thấy hàng của nhau.
 *
 * ⚠️ TIỀN TỆ (ADR-010): VND zero-decimal. Số Medusa trả về ĐÃ là đồng, dùng
 * thẳng, KHÔNG chia 100.
 */

import "server-only";
import { LOCALES, type Locale } from "@/i18n/config";

const GOC = process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000";
const KHOA = process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA || "";

/** Số sản phẩm mỗi trang danh mục. */
export const MOI_TRANG = 24;

/**
 * Thời gian sống của bộ nhớ đệm dữ liệu (giây).
 *
 * Vì sao cần: bản đầu của mọi storefront trong repo này gọi Store API với
 * `cache: "no-store"` ở MỌI hàm, nên mỗi lượt khách xem trang là một lượt
 * Medusa truy vấn PostgreSQL lại từ đầu. Phần lớn công đó là làm lại y hệt
 * nhau — cây danh mục cả tháng không đổi một lần.
 *
 * Chọn TTL theo mức độ biến động của TỪNG loại dữ liệu, KHÔNG một con số chung:
 * danh mục gần như tĩnh, giá và tồn kho phải tươi.
 */
export const TTL = {
  /** Cây danh mục — đổi khi vận hành thêm/bớt ngành hàng, rất hiếm. */
  DANH_MUC: 300,
  /** Danh sách sản phẩm theo danh mục — chịu ảnh hưởng của giá, giữ ngắn. */
  DANH_SACH_SAN_PHAM: 60,
  /** Chi tiết một sản phẩm — giá hiển thị cho khách, giữ ngắn nhất. */
  CHI_TIET_SAN_PHAM: 60,
  /** Region của shop — cấu hình hạ tầng, gần như không bao giờ đổi. */
  REGION: 3600,
  /** Trang tĩnh, bài viết — nội dung biên tập, đổi theo ngày. */
  NOI_DUNG: 300,
} as const;

/**
 * Hết giờ cho một lời gọi Medusa (mili-giây).
 *
 * ⚠️ ĐỪNG BỎ. Bản trước KHÔNG có giới hạn này, và hậu quả đã đo được ngày
 * 07/08/2026: khi backend quá tải, `fetch` treo vô hạn, kéo theo cả trang treo
 * — đo trên storefront Huế là hơn 90 giây rồi mới đứt, khách chỉ thấy trang
 * trắng quay mãi. Thà trả trang thiếu một khối hàng còn hơn treo cả site.
 */
const HET_GIO_MS = 8000;

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
  /** Giá gạch ngang — chỉ có khi shop thật sự đang giảm giá. */
  giaGoc: number | null;
  variantId: string | null;
  soBienThe: number;
  tuyChon: { ten: string; giaTri: string[] }[];
  thuongHieu?: string | null;
  sku?: string | null;
  danhMucId?: string | null;
  tonKho?: number | null;
  specs?: Record<string, unknown>;
  /** Mô tả theo ngôn ngữ (`metadata.description_<locale>`); thiếu thì không có khoá. */
  descriptions?: Partial<Record<Locale, string>>;
}

/** Ánh xạ metadata riêng của dữ liệu C.W. Wines do seed-cwwines.ts ghi. */
export function docMetadataCwWines(metadata: Record<string, any> | null | undefined) {
  const meta = metadata ?? {};
  return {
    specs: (meta.specs ?? {}) as Record<string, unknown>,
    descriptions: Object.fromEntries(
      LOCALES.flatMap((l) => {
        const mota = meta[`description_${l}`];
        return typeof mota === "string" && mota.trim() ? [[l, mota]] : [];
      })
    ) as Partial<Record<Locale, string>>,
    priceAud: Number(meta.price_aud ?? 0) || 0,
  };
}

export class LoiMedusa extends Error {
  constructor(public trangThai: number, message: string) {
    super(message);
    this.name = "LoiMedusa";
  }
}

/**
 * Gọi Store API của Medusa.
 *
 * `giaySong` là số giây giữ kết quả trong Data Cache của Next.js. Truyền 0 để
 * buộc gọi mới hoàn toàn — chỉ dùng cho dữ liệu không được phép cũ (giỏ hàng,
 * tồn kho lúc đặt hàng).
 *
 * ⚠️ `next: { revalidate }` và `cache: "no-store"` LOẠI TRỪ nhau; đặt cả hai
 * thì Next.js bỏ qua một cái mà không báo. Vì vậy ở đây rẽ nhánh rõ ràng.
 */
export async function goiMedusa<T = any>(
  duongDan: string,
  giaySong: number = TTL.DANH_SACH_SAN_PHAM,
  the?: string[]
): Promise<T> {
  if (!KHOA) {
    throw new LoiMedusa(500, "Thiếu CONFIG_PUBLISHABLE_KEY_MEDUSA.");
  }

  const ac = new AbortController();
  const hetGio = setTimeout(() => ac.abort(), HET_GIO_MS);

  try {
    const res = await fetch(`${GOC}${duongDan}`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": KHOA,
      },
      signal: ac.signal,
      ...(giaySong > 0
        ? { next: { revalidate: giaySong, ...(the ? { tags: the } : {}) } }
        : { cache: "no-store" as const }),
    });

    const chu = await res.text();
    let d: any = {};
    try {
      d = chu ? JSON.parse(chu) : {};
    } catch {
      d = { message: chu.slice(0, 200) };
    }
    if (!res.ok) {
      throw new LoiMedusa(res.status, d?.message || `Medusa ${res.status}`);
    }
    return d as T;
  } finally {
    clearTimeout(hetGio);
  }
}

/**
 * Bọc một lời gọi để KHÔNG BAO GIỜ ném lỗi lên tầng giao diện.
 *
 * Dùng cho các khối phụ của trang: một dải "sản phẩm gợi ý" hỏng thì trang vẫn
 * phải hiện, chỉ thiếu dải đó. Đừng dùng cho dữ liệu chính của trang — trang
 * sản phẩm mà không có sản phẩm thì nên trả 404 thật, không nên hiện trang rỗng.
 */
export async function chiuLoi<T>(viec: Promise<T>, duPhong: T, ten: string): Promise<T> {
  try {
    return await viec;
  } catch (e) {
    const laHetGio = e instanceof Error && e.name === "AbortError";
    console.error(`[medusa] ${ten} ${laHetGio ? "HẾT GIỜ" : "lỗi"}:`, e);
    return duPhong;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Region — cần cho Store API tính ra giá
// ─────────────────────────────────────────────────────────────────────────────

let regionDaCache: string | null = null;

/**
 * Id region của shop. Thiếu nó thì Store API trả `calculated_price` = null và
 * cả site hiện giá 0 đồng — lỗi im lặng, không có cảnh báo nào.
 *
 * Hai lớp đệm chồng nhau: biến trong tiến trình (nhanh nhất, không tốn một lượt
 * fetch) và Data Cache của Next.js một giờ (dùng lại được sau khi tiến trình
 * khởi động lại).
 *
 * ⚠️ ĐỪNG dùng `force-cache` ở đây như bản đầu: nó đệm VĨNH VIỄN, đổi region
 * trong Medusa thì storefront không bao giờ biết cho tới khi dựng lại.
 */
export async function layRegionId(): Promise<string | null> {
  if (regionDaCache) return regionDaCache;

  const d = await chiuLoi(
    goiMedusa<{ regions: { id: string }[] }>("/store/regions", TTL.REGION, ["regions"]),
    { regions: [] },
    "layRegionId"
  );

  regionDaCache = d.regions?.[0]?.id ?? null;
  return regionDaCache;
}
