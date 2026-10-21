"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { docDonVuaDat, dinhDangThoiDiem, maHienThiDon, type DonVuaDat } from "@/lib/don-hang";
import T, { Tien } from "@/components/T";
import { useT } from "@/i18n/use-t";

/**
 * Nội dung trang xác nhận đơn hàng.
 *
 * Ba lỗi được chữa ở đây (báo cáo kiểm thử 05/08/2026):
 *
 *   · BUG-R26 — mã đơn hàng trước đây là chuỗi cứng `RA-771092` viết thẳng
 *     trong JSX, nên mọi đơn của mọi khách đều trùng nhau. Nay mã do
 *     `taoMaDonHang()` sinh riêng cho từng đơn và được đọc lại từ phiên.
 *   · BUG-R27 — trang luôn chào "CẢM ƠN ANH SỸ" và không hiện địa chỉ, số điện
 *     thoại hay danh sách sản phẩm. Nay in đúng tên khách vừa nhập và đủ thông
 *     tin để khách tự kiểm tra lại đơn.
 *   · BUG-R28 — mở thẳng đường dẫn này khi chưa đặt hàng vẫn thấy một đơn hàng
 *     đầy đủ. Nay không có đơn trong phiên thì tự đưa về giỏ hàng.
 *
 * Đọc trong `useEffect` chứ không lúc render: HTML từ máy chủ và lần render đầu
 * ở trình duyệt phải giống hệt nhau, nếu không sẽ lệch hydration.
 */
export default function XacNhanDonHang() {
  const t = useT();
  const router = useRouter();
  const [don, setDon] = useState<DonVuaDat | null>(null);
  const [daDoc, setDaDoc] = useState(false);

  useEffect(() => {
    const d = docDonVuaDat();
    setDon(d);
    setDaDoc(true);
    // SỬA BUG-R28 — không có đơn nào trong phiên thì đây không phải trang của khách.
    if (!d) router.replace("/gio-hang");
  }, [router]);

  if (!daDoc) {
    return (
      <div className="panel px-4 py-16 text-center text-[13px] text-ink-muted">
        <T k="order_done.loading" />
      </div>
    );
  }

  if (!don) {
    return (
      <div className="panel px-4 py-14 text-center">
        <h2 className="m-0 text-base font-bold text-ink-strong">
          <T k="order_done.no_order_title" />
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">
          <T k="order_done.no_order_body" />
        </p>
        <div className="mt-4">
          <Link href="/gio-hang" className="btn-wine no-underline">
            <T k="order_done.back_to_cart" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-wine-pale text-2xl font-bold text-wine">
          ✓
        </div>

        <span className="tag bg-wine-pale text-wine"><T k="order_done.received" /></span>

        {/* SỬA BUG-R27: chào đúng tên khách vừa nhập, không còn tên gán cứng. */}
        <h1 className="m-0 mt-2 text-xl font-bold uppercase tracking-wide text-ink-strong">
          <T k="order_done.thanks" v={{ ten: don.hoTen }} />
        </h1>

        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink">
          <T k="order_done.order_code" />{" "}
          <strong className="font-bold text-wine">{maHienThiDon(don.maDon)}</strong>
          {don.datLuc && <T k="order_done.placed_on" v={{ thoi: dinhDangThoiDiem(don.datLuc, t("common.at")) }} />}
          <T k="order_done.staff_call" />
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
        <div className="rounded border border-line px-3 py-2">
          <div className="text-2xs text-ink-muted"><T k="order_done.delivery_method" /></div>
          <div className="text-[13px] font-semibold text-ink-strong">
            {don.giaoHang === "Giao hàng tiêu chuẩn" ? <T k="order_done.shipping_standard" /> : don.giaoHang}
          </div>
        </div>
        <div className="rounded border border-line px-3 py-2">
          <div className="text-2xs text-ink-muted"><T k="order_done.total_paid" /></div>
          <div className="text-[13px] font-bold text-wine">
            <Tien so={don.tongThanhToan} />
          </div>
        </div>
        <div className="rounded border border-line px-3 py-2">
          <div className="text-2xs text-ink-muted"><T k="order_done.status" /></div>
          <div className="text-[13px] font-semibold text-wine"><T k="order_done.status_packing" /></div>
        </div>
      </div>

      {/* SỬA BUG-R27: khối thông tin nhận hàng — trước đây hoàn toàn không có. */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded border border-line p-3 text-left">
          <h2 className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-strong">
            <T k="order_done.delivery_info" />
          </h2>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-muted"><T k="order_done.recipient" /></dt>
              <dd className="m-0 font-semibold text-ink-strong">{don.hoTen}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-muted"><T k="order_done.phone" /></dt>
              <dd className="m-0 font-semibold text-ink-strong">{don.dienThoai}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-muted"><T k="order_done.address" /></dt>
              <dd className="m-0 text-ink">{don.diaChi}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-muted"><T k="order_done.payment" /></dt>
              <dd className="m-0 text-ink">
                {don.phuongThuc === "chuyen-khoan" ? <T k="order_done.pay_transfer" /> : <T k="order_done.pay_cod" />}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded border border-line p-3 text-left">
          <h2 className="m-0 mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-strong">
            <T k="order_done.items_ordered" />
          </h2>
          <ul className="m-0 list-none space-y-1.5 p-0 text-[13px]">
            {don.monHang.map((m, k) => (
              <li key={`${m.sku}-${k}`} className="flex justify-between gap-2">
                <span className="dong-2 text-ink-muted">
                  {m.title}
                  {m.soLuong > 1 && (
                    <span className="font-semibold text-ink"> × {m.soLuong}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-ink">
                  <Tien so={m.thanhTien} />
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-2 space-y-1 border-t border-line pt-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted"><T k="order_done.subtotal" /></dt>
              <dd className="m-0 font-semibold text-ink"><Tien so={don.tamTinh} /></dd>
            </div>
            {don.tienGiamMa > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted"><T k="order_done.discount_code" v={{ ma: don.maGiamGia ?? "" }} /></dt>
                <dd className="m-0 font-semibold text-wine">
                  −<Tien so={don.tienGiamMa} />
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted"><T k="order_done.shipping_fee" /></dt>
              <dd className="m-0 font-semibold text-wine">
                {don.phiGiaoHang === 0 ? <T k="order_done.free" /> : <Tien so={don.phiGiaoHang} />}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line pt-1">
              <dt className="font-semibold text-ink-strong"><T k="order_done.total_paid" /></dt>
              <dd className="m-0 font-bold text-wine">
                <Tien so={don.tongThanhToan} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* SỬA BUG-R04: cam kết viết lại theo đúng ngành rượu — bản cũ chép nguyên
          của site mỹ phẩm ("đền bù 200% nếu hàng giả", "đổi trả 14 ngày nếu chưa
          qua sử dụng"), trong khi chính sách thật của C.W. Wines là 24 giờ cho
          hàng vỡ/sai và 7 ngày cho rượu lỗi chất lượng. */}
      <div className="mt-4 rounded border border-line bg-wine-pale p-3 text-left">
        <h2 className="m-0 mb-1.5 text-[13px] font-bold uppercase tracking-wide text-wine">
          <T k="order_done.promise_title" />
        </h2>
        <ul className="m-0 list-none space-y-1 p-0 text-2xs leading-relaxed text-ink">
          <li>
            <T k="order_done.promise_1" />
          </li>
          <li>
            <T k="order_done.promise_2" />
          </li>
          <li>
            <T k="order_done.promise_3" />{" "}
            <Link href="/chinh-sach/chinh-sach-doi-tra" className="text-wine underline">
              <T k="order_done.returns_policy" />
            </Link>
            .
          </li>
          <li><T k="order_done.promise_4" /></li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={`/theo-doi-don-hang?ma=${encodeURIComponent(maHienThiDon(don.maDon))}`} className="btn-wine no-underline">
          <T k="order_done.track_order" />
        </Link>
        <Link href="/" className="btn-wine-outline no-underline">
          <T k="order_done.back_home" />
        </Link>
        <Link href="/danh-muc/all" className="btn-wine-outline no-underline">
          <T k="order_done.keep_shopping" />
        </Link>
      </div>
    </div>
  );
}
