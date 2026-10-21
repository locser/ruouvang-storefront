"use client";

import Link from "next/link";
import { useState } from "react";
import AnhChai from "@/components/AnhChai";
import GoiYGioHang from "@/components/GoiYGioHang";
import T, { Tien } from "@/components/T";
import TienDoUuDai from "@/components/khuyen-mai/TienDoUuDai";
import GoiYChaiThu6 from "@/components/khuyen-mai/GoiYChaiThu6";
import { useChaiGoiY } from "@/components/khuyen-mai/use-chai-goi-y";
import { CHINH_SACH } from "@/lib/khuyen-mai";
import { useGioHang, dinhDangTien, tranTheoTonKhoThat } from "@/lib/gio-hang-context";
import { tienSong } from "@/lib/tien";

/**
 * Giỏ hàng — giao diện boutique: tiêu đề serif canh giữa, mỗi chai một hàng
 * thoáng (ảnh trên nền kem · tên · số lượng · thành tiền), tóm tắt đơn dính
 * bên phải. Logic giỏ hàng giữ nguyên.
 *
 * Các lỗi đã chữa theo báo cáo kiểm thử 05/08/2026:
 *
 *   · BUG-R04 — câu chữ còn sót của template mỹ phẩm Hasaki ("MỸ PHẨM", "loại
 *     da", "Đền 200% nếu phát hiện hàng giả"). Đã thay bằng cam kết ngành rượu.
 *   · BUG-R08 — nút "+" khoá lại khi chạm tồn kho, thay vì cho tăng vô hạn.
 *   · BUG-R03 — link "Chính sách đổi trả" phải là `/chinh-sach/chinh-sach-doi-tra`.
 */
export default function CartPage() {
  const {
    danhSach,
    daTaiXong,
    doiSoLuong,
    xoaKhoiGio,
    xoaHet,
    tongGiamGia,
    tongSoLuong,
    uuDai,
  } = useGioHang();
  const chaiGoiY = useChaiGoiY();

  const [hoiXoaHet, setHoiXoaHet] = useState(false);

  return (
    <div className="container-site py-10 pb-28 md:py-16 lg:pb-16">
      <header className="mb-12 text-center md:mb-16">
        <p className="nhan-nho mb-4">Đơn hàng của anh/chị</p>
        <h1 className="tieu-de-section gach-tieu-de">Giỏ hàng</h1>
        {daTaiXong && danhSach.length > 0 && (
          <p className="mt-5 text-[13px] tracking-wide text-ink-muted">
            {tongSoLuong} sản phẩm
          </p>
        )}
      </header>

      {/* Chưa đọc xong localStorage: hiện khung chờ để không nhấp nháy "giỏ rỗng" */}
      {!daTaiXong && (
        <p className="py-24 text-center font-display text-[24px] italic text-ink-muted">
          Đang tải giỏ hàng…
        </p>
      )}

      {/* Giỏ rỗng */}
      {daTaiXong && danhSach.length === 0 && (
        <div className="mx-auto max-w-lg border-y border-line py-16 text-center">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto mb-6 h-9 w-9 stroke-copper"
            fill="none"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5.5 8h13l-1 11.5h-11L5.5 8Zm3.5 0V7a3 3 0 0 1 6 0v1" />
          </svg>
          <h2 className="m-0 text-[30px] font-normal">Giỏ hàng đang trống</h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-[1.8] text-ink-muted">
            Anh/chị chưa chọn chai nào. Hãy khám phá bộ sưu tập; phạm vi và thời gian
            giao hàng sẽ được xác nhận khi đặt.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/danh-muc/welcome20-discount" className="btn-wine">
              Khám phá bộ sưu tập
            </Link>
            <Link href="/" className="btn-wine-outline">
              Về trang chủ
            </Link>
          </div>
        </div>
      )}

      {/* Giỏ có hàng */}
      {daTaiXong && danhSach.length > 0 && (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          {/* Danh sách sản phẩm */}
          <div>
            <TienDoUuDai giaChaiGoiY={chaiGoiY?.price_vnd} />
            <div className="hidden grid-cols-[1fr_130px_110px] gap-4 border-b border-ink/20 pb-3 text-[11px] font-medium uppercase tracking-caps text-copper-ink sm:grid">
              <span>Sản phẩm</span>
              <span className="text-center">Số lượng</span>
              <span className="text-right">Thành tiền</span>
            </div>

            <ul className="m-0 list-none divide-y divide-line p-0">
              {danhSach.map((mon) => {
                const tran = tranTheoTonKhoThat(mon.tonKho, mon.id);
                return (
                  <li
                    key={mon.id}
                    className="grid grid-cols-[96px_1fr] gap-x-5 gap-y-4 py-7 sm:grid-cols-[96px_1fr_130px_110px] sm:items-center"
                  >
                    <Link
                      href={`/san-pham/${mon.handle}`}
                      className="the-sp__nen relative block aspect-[3/4] w-24 overflow-hidden"
                      aria-label={mon.title}
                    >
                      <AnhChai
                        src={mon.thumbnail}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-contain p-2 mix-blend-multiply"
                      />
                    </Link>

                    <div className="min-w-0">
                      <Link href={`/san-pham/${mon.handle}`} className="no-underline">
                        <h2 className="dong-2 m-0 font-display text-[21px] font-medium leading-[1.25] text-ink transition-colors duration-300 hover:text-wine">
                          {mon.title}
                        </h2>
                      </Link>
                      <p className="mt-1.5 text-[12px] tracking-wide text-ink-soft">
                        {mon.sku && <>SKU {mon.sku} · </>}
                        <Tien so={mon.price} />
                        {mon.originalPrice && mon.originalPrice > mon.price && (
                          <span className="ml-2 line-through">
                            <Tien so={mon.originalPrice} />
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => xoaKhoiGio(mon.id)}
                        aria-label={`Xoá ${mon.title} khỏi giỏ hàng`}
                        className="lien-ket mt-3 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-wine"
                      >
                        Xoá
                      </button>
                    </div>

                    {/* SỬA BUG-R08: khoá nút "+" khi đã lấy hết số chai còn lại. */}
                    <div className="col-start-2 flex flex-col items-start gap-1.5 sm:col-start-auto sm:items-center">
                      <div className="flex h-11 items-stretch border border-ink/25 text-[14px] text-ink">
                        <button
                          type="button"
                          onClick={() => doiSoLuong(mon.id, mon.soLuong - 1)}
                          aria-label={`Giảm số lượng ${mon.title}`}
                          className="w-11 cursor-pointer border-0 bg-transparent text-[18px] leading-none text-ink-muted transition-colors hover:bg-stone"
                        >
                          −
                        </button>
                        <span className="flex w-10 items-center justify-center border-x border-ink/25 font-medium tabular-nums">
                          {mon.soLuong}
                        </span>
                        <button
                          type="button"
                          onClick={() => doiSoLuong(mon.id, mon.soLuong + 1)}
                          disabled={mon.soLuong >= tran}
                          aria-label={`Tăng số lượng ${mon.title}`}
                          className="w-11 cursor-pointer border-0 bg-transparent text-[18px] leading-none text-ink-muted transition-colors hover:bg-stone disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      {mon.soLuong >= tran && (
                        <span className="text-[12px] font-medium text-wine">
                          Chỉ còn {tran} chai
                        </span>
                      )}
                    </div>

                    <div className="col-start-2 text-[16px] font-medium tabular-nums text-ink sm:col-start-auto sm:text-right">
                      <Tien so={mon.price * mon.soLuong} />
                    </div>
                  </li>
                );
              })}
            </ul>

            <GoiYChaiThu6 chai={chaiGoiY} />

            {/* Hai nút cùng kích thước, cùng kiểu chữ với nút "Tiếp tục chọn rượu" ở trang xác nhận. */}
            <div className="mt-8 border-t border-ink/20 pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/danh-muc/welcome20-discount" className="btn-wine-outline w-full no-underline">
                  Tiếp tục chọn rượu
                </Link>
                <button type="button" onClick={() => setHoiXoaHet(true)} className="btn-wine-outline w-full">
                  Xoá toàn bộ giỏ hàng
                </button>
              </div>

              {/* Xoá là hành động phá huỷ nên luôn hỏi lại trước khi thực hiện. */}
              {hoiXoaHet && (
                <div role="alertdialog" aria-label="Xác nhận xoá giỏ hàng" className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                  <span className="text-ink">Xoá {tongSoLuong} sản phẩm khỏi giỏ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      xoaHet();
                      setHoiXoaHet(false);
                    }}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium uppercase tracking-[0.14em] text-wine underline underline-offset-4"
                  >
                    Xoá hết
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setHoiXoaHet(false)}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium uppercase tracking-[0.14em] text-ink underline underline-offset-4"
                  >
                    Giữ lại
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tóm tắt đơn hàng */}
          <div className="h-fit space-y-5 lg:sticky lg:top-[120px]">
            <aside className="h-fit border border-line bg-cream p-5 sm:p-7 lg:p-9">
            <h2 className="m-0 text-[28px] font-normal">Tổng đơn hàng</h2>
            <span className="my-5 block h-px w-10 bg-copper" aria-hidden="true" />

            <dl className="m-0 space-y-3.5 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">
                  <T k="promo.subtotal" v={{ n: tongSoLuong }} />
                </dt>
                <dd className="m-0 shrink-0 tabular-nums text-ink"><Tien so={uuDai.tamTinh} /></dd>
              </div>

              {tongGiamGia > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Giảm giá khuyến mãi</dt>
                  <dd className="m-0 shrink-0 tabular-nums text-wine">−<Tien so={tongGiamGia} /></dd>
                </div>
              )}

              {uuDai.thung.giam > 0 && (
                <div className="flex justify-between gap-3 text-[#3F6B45]">
                  <dt>
                    <T k="promo.case_discount" v={{ box: CHINH_SACH.chaiMoiThung, pct: CHINH_SACH.phanTramThung }} />
                  </dt>
                  <dd className="m-0 shrink-0 tabular-nums">−<Tien so={uuDai.thung.giam} /></dd>
                </div>
              )}

              {uuDai.ma?.hopLe && uuDai.giamMa > 0 && (
                <div className="flex justify-between gap-3 text-[#3F6B45]">
                  <dt>
                    <T k="promo.code_line" v={{ ma: uuDai.ma.ma.ma }} />
                  </dt>
                  <dd className="m-0 shrink-0 tabular-nums">−<Tien so={uuDai.giamMa} /></dd>
                </div>
              )}

              {uuDai.tangQua && (
                <div className="flex justify-between gap-3 text-[#3F6B45]">
                  <dt>
                    <T k="promo.gift_line" />
                  </dt>
                  <dd className="m-0 shrink-0">
                    <T k="promo.gift_line_value" />
                  </dd>
                </div>
              )}

              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">
                  <T k="promo.shipping" />
                </dt>
                <dd className="m-0 shrink-0 tabular-nums text-ink">
                  {uuDai.mienPhiGiao ? (
                    <>
                      <s className="mr-1.5 text-ink-soft"><Tien so={uuDai.phiGiaoGoc} /></s>
                      <span className="text-[#3F6B45]">
                        <T k="promo.free" />
                      </span>
                    </>
                  ) : (
                    <Tien so={uuDai.phiGiao} />
                  )}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-5">
                <dt className="text-[12px] font-medium uppercase tracking-caps text-ink">
                  <T k="promo.total" />
                </dt>
                <dd className="m-0 shrink-0 text-[24px] font-medium tabular-nums text-ink">
                  <Tien so={uuDai.tongThanhToan} />
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-right text-[12px] text-ink-soft">
              <T k="promo.vat" />
            </p>

            {uuDai.tietKiem > 0 && (
              <p className="mt-4 bg-[#EDF3EC] px-3 py-2.5 text-center text-[13px] text-[#2F5535]">
                <T k="promo.saving_banner" v={{ so: tienSong(uuDai.tietKiem) }} />
              </p>
            )}

            <Link href="/thanh-toan" className="btn-wine mt-7 w-full">
              Tiến hành đặt hàng
            </Link>

            {/* SỬA BUG-R04: các dòng cam kết cũ là của website mỹ phẩm. */}
            <ul className="m-0 mt-7 list-none space-y-2.5 border-t border-line p-0 pt-6 text-[13px] leading-relaxed text-ink-muted">
              <li>Rượu nhập khẩu chính ngạch, đủ chứng từ và tem nhãn phụ</li>
              <li>Phí giao hàng tiêu chuẩn: 50.000đ mỗi đơn, miễn phí cho đơn từ 1.500.000đ</li>
              <li>
                <Link
                  href="/chinh-sach/chinh-sach-doi-tra"
                  className="lien-ket text-ink-muted transition-colors hover:text-wine"
                >
                  Đổi chai mới hoặc hoàn tiền nếu chai vỡ, giao sai hoặc rượu lỗi
                </Link>
              </li>
              <li>Không bán rượu cho người dưới 18 tuổi</li>
            </ul>
            </aside>
          </div>
        </div>
      )}

      {daTaiXong && (
        <GoiYGioHang
          daCo={danhSach.map((m) => m.handle)}
          tieuDe={
            danhSach.length === 0
              ? "cart_suggest.start_with_these"
              : "cart_suggest.you_may_also_like"
          }
        />
      )}

      {/* Thanh dính đáy màn hình (chỉ mobile/tablet): nút đặt hàng luôn trong tầm ngón cái. */}
      {daTaiXong && danhSach.length > 0 && (
        <div
          data-thanh-duoi=""
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="container-site flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[11px] uppercase tracking-caps text-ink-soft">
                {uuDai.tietKiem > 0 ? (
                  <T k="promo.sticky_saving" v={{ so: tienSong(uuDai.tietKiem) }} />
                ) : (
                  <T k="promo.sticky_total" />
                )}
              </p>
              <p className="m-0 text-[20px] font-medium tabular-nums leading-tight text-ink">
                <Tien so={uuDai.tongThanhToan} />
              </p>
            </div>
            <Link href="/thanh-toan" className="btn-wine shrink-0 !px-6">
              <T k="promo.place_order" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
