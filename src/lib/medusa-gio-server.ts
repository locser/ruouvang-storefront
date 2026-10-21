/**
 * Gọi Store API của Medusa từ phía server (route handler của storefront).
 *
 * Dùng chung cho `/api/dat-hang` (đặt hàng) và `/api/ma-giam-gia` (kiểm tra mã) để
 * cả hai cùng tính tiền bằng một bộ máy: Medusa. CHỈ import từ code phía server.
 */

const MEDUSA_URL = process.env.CONFIG_API_MEDUSA_URL || "http://backend-cwwines:9000";
const PUBLISHABLE_KEY = process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA || "";
const HET_GIO_MS = 8000;

export class LoiStoreApi extends Error {
  constructor(public trangThai: number, message: string) {
    super(message);
    this.name = "LoiStoreApi";
  }
}

export interface MonGui {
  handle: string;
  sku?: string;
  soLuong: number;
}

export async function goiStore<T>(
  duongDan: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  if (!PUBLISHABLE_KEY) {
    throw new LoiStoreApi(503, "Shop chưa cấu hình CONFIG_PUBLISHABLE_KEY_MEDUSA.");
  }

  const controller = new AbortController();
  const hetGio = setTimeout(() => controller.abort(), HET_GIO_MS);
  try {
    const response = await fetch(`${MEDUSA_URL}${duongDan}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw.slice(0, 200) };
    }
    if (!response.ok) {
      throw new LoiStoreApi(
        response.status,
        data?.message || `Store API trả mã ${response.status}.`
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LoiStoreApi(504, "Store API quá thời gian 8 giây.");
    }
    if (error instanceof LoiStoreApi) throw error;
    // Lỗi mạng (backend tắt, sai địa chỉ…): undici chỉ nói "fetch failed" — vô nghĩa với khách.
    // Ghi nguyên nhân thật ra log, còn khách nhận câu giải thích được.
    console.error("[medusa-gio-server] không gọi được Medusa:", duongDan, error);
    throw new LoiStoreApi(
      503,
      "Hệ thống đặt hàng đang tạm gián đoạn. Anh/chị vui lòng thử lại sau ít phút hoặc gọi hotline để được hỗ trợ."
    );
  } finally {
    clearTimeout(hetGio);
  }
}

/** Region VND của shop (region đầu tiên của Store API). */
export async function layRegionId(): Promise<string> {
  const regions = await goiStore<{ regions: Array<{ id: string }> }>("/store/regions");
  const regionId = regions.regions?.[0]?.id;
  if (!regionId) throw new LoiStoreApi(503, "Shop chưa có region VND.");
  return regionId;
}

/**
 * Thêm một món vào cart Medusa: tìm biến thể theo handle/SKU, kiểm tra tồn kho và giá,
 * rồi thêm line item. Trả về cart sau khi thêm.
 */
export async function themMonVaoGio(cartId: string, regionId: string, mon: MonGui): Promise<any> {
  const query =
    `/store/products?handle=${encodeURIComponent(mon.handle)}` +
    `&region_id=${encodeURIComponent(regionId)}` +
    `&fields=${encodeURIComponent("*variants.calculated_price,+variants.inventory_quantity")}`;
  const ketQua = await goiStore<{ products: any[] }>(query);
  const product = ketQua.products?.[0];
  const variants: any[] = product?.variants ?? [];
  const variant =
    variants.find((item) => mon.sku && String(item.sku || "") === mon.sku) ?? variants[0];
  if (!variant) {
    throw new LoiStoreApi(409, `Sản phẩm ${mon.handle} chưa có biến thể bán được.`);
  }
  if (variant.manage_inventory !== false) {
    const tonKho = Number(variant.inventory_quantity);
    if (Number.isFinite(tonKho) && tonKho < mon.soLuong) {
      throw new LoiStoreApi(409, `${product.title} chỉ còn ${Math.max(0, tonKho)} sản phẩm.`);
    }
  }
  if (variant.calculated_price?.calculated_amount == null) {
    throw new LoiStoreApi(409, `${product.title} chưa có giá VND hợp lệ.`);
  }
  const them = await goiStore<{ cart: any }>(`/store/carts/${cartId}/line-items`, "POST", {
    variant_id: variant.id,
    quantity: mon.soLuong,
  });
  return them.cart;
}

/**
 * Chọn phương thức giao hàng đầu tiên cho cart. Mã giảm phí giao (FREESHIP…) chỉ áp được
 * khi cart đã có phương thức giao, nên cần bước này trước khi áp mã.
 */
export async function chonPhuongThucGiao(cartId: string): Promise<void> {
  const vanChuyen = await goiStore<{ shipping_options: any[] }>(
    `/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`
  );
  const option = vanChuyen.shipping_options?.[0];
  if (!option?.id) throw new LoiStoreApi(409, "Không có phương thức giao hàng cho giỏ này.");
  await goiStore(`/store/carts/${cartId}/shipping-methods`, "POST", { option_id: option.id });
}

/**
 * Áp một mã giảm giá vào cart. Trả `true` nếu Medusa chấp nhận và mã thật sự nằm trong cart;
 * `false` nếu mã không dùng được cho giỏ này (sai, hết hạn, chưa đủ điều kiện).
 * Lỗi hạ tầng (mất kết nối, backend tắt) thì ném lỗi, không coi là mã sai.
 */
export async function apMaVaoGio(cartId: string, ma: string): Promise<boolean> {
  try {
    const ketQua = await goiStore<{ cart: any }>(`/store/carts/${cartId}/promotions`, "POST", {
      promo_codes: [ma],
    });
    const cart = ketQua.cart ?? (await goiStore<{ cart: any }>(`/store/carts/${cartId}`)).cart;
    return (cart?.promotions ?? []).some((p: any) => String(p.code || "").toUpperCase() === ma);
  } catch (error) {
    if (error instanceof LoiStoreApi && error.trangThai >= 400 && error.trangThai < 500) {
      return false;
    }
    throw error;
  }
}
