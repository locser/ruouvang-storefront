import { NextResponse } from "next/server";
import {
  apMaVaoGio,
  chonPhuongThucGiao,
  goiStore,
  LoiStoreApi,
  layRegionId,
  themMonVaoGio,
  type MonGui,
} from "@/lib/medusa-gio-server";

/**
 * POST /api/ma-giam-gia
 *
 * Kiểm tra một mã giảm giá trên đúng giỏ khách đang có, bằng Medusa. Tạo một cart tạm,
 * thêm các món, áp mã, rồi trả số tiền Medusa tính được. Cart tạm này bị bỏ lại, Medusa
 * tự dọn; đơn thật chỉ được tạo ở /api/dat-hang.
 *
 * Body: { monHang: [{ handle, sku?, soLuong }], maGiamGia: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      monHang?: MonGui[];
      maGiamGia?: string;
    } | null;
    const ma = String(body?.maGiamGia || "").trim().toUpperCase();
    if (!ma) {
      return NextResponse.json({ ok: false, loi: "Anh/chị chưa nhập mã giảm giá." }, { status: 400 });
    }
    const monHang = Array.isArray(body?.monHang) ? body.monHang : [];
    if (monHang.length < 1 || monHang.length > 100) {
      return NextResponse.json({ ok: false, loi: "Giỏ hàng trống." }, { status: 400 });
    }
    const regionId = await layRegionId();
    const taoGio = await goiStore<{ cart: any }>("/store/carts", "POST", { region_id: regionId });
    const cartId = taoGio.cart?.id;
    if (!cartId) throw new LoiStoreApi(502, "Store API không trả id giỏ hàng.");

    for (const mon of monHang) {
      await themMonVaoGio(cartId, regionId, {
        handle: String(mon.handle || ""),
        sku: mon.sku ? String(mon.sku) : undefined,
        soLuong: Math.floor(Number(mon.soLuong)),
      });
    }

    // Mã giảm phí giao chỉ áp được khi đã có phương thức giao hàng, nên chọn trước.
    await chonPhuongThucGiao(cartId);
    const hopLe = await apMaVaoGio(cartId, ma);
    if (!hopLe) {
      return NextResponse.json({
        ok: false,
        loi: "Mã này không áp dụng được cho giỏ hàng hiện tại.",
      });
    }

    const cuoi = await goiStore<{ cart: any }>(
      `/store/carts/${cartId}?fields=*items,+discount_total,+total,+shipping_total,+original_shipping_total`
    );
    const giam = Number(cuoi.cart?.discount_total ?? 0);
    // Phần giảm trên phí giao (ví dụ FREESHIP) tách riêng để không bị trừ vào tiền hàng.
    const giamGiao = Math.max(0, Number(cuoi.cart?.original_shipping_total ?? 0) - Number(cuoi.cart?.shipping_total ?? 0));
    return NextResponse.json({
      ok: true,
      ma,
      giamMa: giam,
      giamGiao,
      giamHang: Math.max(0, giam - giamGiao),
      // Tạm tính = tổng các dòng hàng TRƯỚC giảm; `subtotal` của Medusa đã gồm phí giao.
      tamTinh: (cuoi.cart?.items ?? []).reduce(
        (tong: number, item: any) => tong + Number(item.subtotal ?? 0),
        0
      ),
    });
  } catch (error) {
    const trangThai = error instanceof LoiStoreApi ? error.trangThai : 500;
    const message = error instanceof Error ? error.message : "Không kiểm tra được mã giảm giá.";
    console.error("[ma-giam-gia-cwwines]", error);
    return NextResponse.json({ ok: false, loi: message }, { status: trangThai });
  }
}
