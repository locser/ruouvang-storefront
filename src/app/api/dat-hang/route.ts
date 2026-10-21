import { NextResponse } from "next/server";
import { maDonHienThi } from "@/lib/don-cua-khach";
import {
  apMaVaoGio,
  chonPhuongThucGiao,
  goiStore,
  LoiStoreApi,
  layRegionId,
  themMonVaoGio,
} from "@/lib/medusa-gio-server";

interface MonGuiLen {
  handle: string;
  sku?: string;
  soLuong: number;
}

interface YeuCauDatHang {
  hoTen: string;
  dienThoai: string;
  diaChi: string;
  email?: string;
  phuongThucThanhToan: "cod" | "chuyen-khoan";
  monHang: MonGuiLen[];
  /** Mã giảm giá khách đã áp trong giỏ; để trống nếu không có. */
  maGiamGia: string;
}

function tachHoTen(hoTen: string): { first_name: string; last_name: string } {
  const phan = hoTen.trim().split(/\s+/);
  if (phan.length === 1) return { first_name: phan[0], last_name: "-" };
  return {
    first_name: phan[phan.length - 1],
    last_name: phan.slice(0, -1).join(" "),
  };
}

function kiemTra(body: unknown): YeuCauDatHang {
  if (!body || typeof body !== "object") {
    throw new LoiStoreApi(400, "Dữ liệu đặt hàng không hợp lệ.");
  }
  const data = body as Partial<YeuCauDatHang>;
  const hoTen = String(data.hoTen || "").trim();
  const dienThoai = String(data.dienThoai || "").trim();
  const diaChi = String(data.diaChi || "").trim();
  const email = String(data.email || "").trim();
  if (hoTen.length < 2 || dienThoai.length < 9 || diaChi.length < 10) {
    throw new LoiStoreApi(400, "Thiếu thông tin người nhận hợp lệ.");
  }
  if (!Array.isArray(data.monHang) || data.monHang.length < 1 || data.monHang.length > 100) {
    throw new LoiStoreApi(400, "Giỏ hàng trống hoặc vượt quá 100 dòng.");
  }
  const monHang = data.monHang.map((mon) => {
    const handle = String(mon?.handle || "").trim();
    const sku = String(mon?.sku || "").trim();
    const soLuong = Math.floor(Number(mon?.soLuong));
    if (!handle || !Number.isFinite(soLuong) || soLuong < 1 || soLuong > 99) {
      throw new LoiStoreApi(400, "Một dòng hàng có sản phẩm hoặc số lượng không hợp lệ.");
    }
    return { handle, sku, soLuong };
  });
  // Chỉ nhận đúng hai giá trị đã biết; giá trị lạ coi như COD thay vì làm hỏng đơn.
  const phuongThucThanhToan = data.phuongThucThanhToan === "chuyen-khoan" ? "chuyen-khoan" : "cod";
  const maGiamGia = String(data.maGiamGia || "").trim().toUpperCase();
  return { hoTen, dienThoai, diaChi, email, phuongThucThanhToan, monHang, maGiamGia };
}

export async function POST(request: Request) {
  try {
    const input = kiemTra(await request.json());
    const regionId = await layRegionId();

    const taoGio = await goiStore<{ cart: any }>("/store/carts", "POST", {
      region_id: regionId,
    });
    const cartId = taoGio.cart?.id;
    if (!cartId) throw new LoiStoreApi(502, "Store API không trả id giỏ hàng.");

    let cart = taoGio.cart;
    for (const mon of input.monHang) {
      cart = await themMonVaoGio(cartId, regionId, mon);
    }

    const ten = tachHoTen(input.hoTen);
    const diaChi = {
      ...ten,
      address_1: input.diaChi,
      city: "Việt Nam",
      country_code: "vn",
      phone: input.dienThoai,
    };
    const soDienThoai = input.dienThoai.replace(/\D/g, "");
    const capNhat = await goiStore<{ cart: any }>(`/store/carts/${cartId}`, "POST", {
      email: input.email || `${soDienThoai}@khach.local`,
      shipping_address: diaChi,
      billing_address: diaChi,
      // Để nhân viên biết đơn này đang CHỜ TIỀN chuyển khoản, đừng xử lý như COD.
      metadata: {
        phuong_thuc_thanh_toan: input.phuongThucThanhToan,
        kenh_dat_hang: "website",
        thanh_toan_trang_thai: input.phuongThucThanhToan === "cod" ? "cod" : "cho_chuyen_khoan",
      },
    });
    cart = capNhat.cart;

    // Chọn giao hàng TRƯỚC khi áp mã: mã giảm phí giao chỉ áp được khi giỏ đã có phương thức giao.
    await chonPhuongThucGiao(cartId);
    const chiTietGiao = await goiStore<{ cart: any }>(`/store/carts/${cartId}`);
    cart = chiTietGiao.cart;
    const option = await goiStore<{ shipping_options: any[] }>(
      `/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`
    ).then((r) => r.shipping_options?.[0]);

    // Áp mã TRƯỚC khi tạo phiên thanh toán: Medusa tính số tiền thanh toán theo tổng sau giảm.
    if (input.maGiamGia) {
      const hopLe = await apMaVaoGio(cartId, input.maGiamGia);
      if (!hopLe) {
        throw new LoiStoreApi(
          409,
          "Mã giảm giá không còn áp dụng được cho giỏ này. Anh/chị vui lòng bỏ mã và thử lại."
        );
      }
    }

    const collection = await goiStore<{ payment_collection: { id: string } }>(
      "/store/payment-collections",
      "POST",
      { cart_id: cartId }
    );
    const providers = await goiStore<{ payment_providers: Array<{ id: string }> }>(
      `/store/payment-providers?region_id=${encodeURIComponent(regionId)}`
    );
    const providerId = providers.payment_providers?.[0]?.id || "pp_system_default";
    await goiStore(
      `/store/payment-collections/${collection.payment_collection.id}/payment-sessions`,
      "POST",
      { provider_id: providerId }
    );

    const hoanTat = await goiStore<any>(`/store/carts/${cartId}/complete`, "POST");
    if (!hoanTat?.order?.id) {
      throw new LoiStoreApi(409, hoanTat?.error?.message || "Medusa chưa thể chốt đơn.");
    }
    const order = hoanTat.order;
    const monDon = (order.items ?? cart.items ?? []).map((item: any) => ({
      title: String(item.product_title || item.title || "Sản phẩm"),
      sku: String(item.variant_sku || item.variant?.sku || ""),
      soLuong: Number(item.quantity || 0),
      // Thành tiền TRƯỚC giảm: `total` của dòng đã trừ mã giảm, nên tạm tính lấy `subtotal`.
      thanhTien: Number(
        item.subtotal ?? item.total ?? Number(item.unit_price || 0) * Number(item.quantity || 0)
      ),
    }));
    return NextResponse.json({
      ok: true,
      donHang: {
        id: order.id,
        ma: maDonHienThi(order),
        // Tạm tính = tổng các dòng hàng. `subtotal` của Medusa đã gồm phí giao, nên không dùng.
        tamTinh: monDon.reduce((tong: number, m: { thanhTien: number }) => tong + m.thanhTien, 0),
        giamMa: Number(order.discount_total ?? cart.discount_total ?? 0),
        phiGiaoHang: Number(order.shipping_total ?? cart.shipping_total ?? option.amount ?? 0),
        tongThanhToan: Number(order.total ?? cart.total ?? 0),
        giaoHang: String(option.name || "Giao hàng tiêu chuẩn"),
        monHang: monDon,
      },
    });
  } catch (error) {
    const trangThai = error instanceof LoiStoreApi ? error.trangThai : 500;
    const message = error instanceof Error ? error.message : "Không đặt được hàng.";
    console.error("[dat-hang-cwwines]", error);
    return NextResponse.json({ ok: false, loi: message }, { status: trangThai });
  }
}
