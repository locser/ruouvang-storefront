"use client";

import NhanSanPham from "./NhanSanPham";
import { useGioHang } from "@/lib/gio-hang-context";
import { CHINH_SACH } from "@/lib/khuyen-mai";
import { translate } from "@/i18n/translate";
import { useT } from "@/i18n/use-t";
import { layHuongVi, layMonAn, layNhan } from "@/lib/huong-vi";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NutThemVaoGio from "./NutThemVaoGio";
import T, { LBlock, TL } from "./T";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { theoNgonNgu } from "@/i18n/translate";
import Anh from "./Anh";
import AnhChai from "./AnhChai";
import type { Product } from "@/lib/data";
import { HE_THONG_CUA_HANG, SO_CUA_HANG } from "@/lib/theme";
import { tonKhoThat } from "@/lib/ton-kho";
import { Tien } from "@/components/T";
import { tienSong } from "@/lib/tien";

/** Biểu tượng nét mảnh cho danh sách cam kết. */
function Bieu({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-[18px] w-[18px] shrink-0 stroke-copper-ink"
      fill="none"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Chi tiết một chai rượu.
 *
 * Bên trái: chai trên nền kem ấm, dính khi cuộn (desktop) để khách vừa đọc
 * thông số vừa nhìn chai. Bên phải: nhà rượu → tên → giá → tồn kho → số lượng
 * + thêm giỏ → cam kết → bảng thông số. Mô tả dài nằm riêng bên dưới, độ rộng
 * dòng giới hạn ~62 ký tự cho dễ đọc.
 *
 * Bảng thông số lấy từ các tag `Grape_…`, `Country_…`, `Region_…`,
 * `Capacity_…`, `Abv_…` mà crawler đã bóc — đó là những cột khách mua rượu so
 * sánh.
 */
export default function ChiTietSanPham({
  product,
  ghepCung = [],
}: {
  product: Product;
  /** Vài chai hay được chọn cùng (tối đa 2 được hiện). */
  ghepCung?: Product[];
}) {
  const t = useT();
  const { uuDai, daTaiXong } = useGioHang();
  const anh = product.images?.length ? product.images : [product.thumbnail].filter(Boolean);
  const [iAnh, setIAnh] = useState(0);
  const [soLuong, setSoLuong] = useState(1);

  // Thanh dính đáy (mobile) chỉ hiện khi nút "Thêm vào giỏ" chính đã cuộn khuất,
  // để hai nút giống nhau không cùng xuất hiện trên một màn hình.
  const nutChinh = useRef<HTMLDivElement>(null);
  const [nutKhuat, setNutKhuat] = useState(false);
  useEffect(() => {
    const el = nutChinh.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const qs = new IntersectionObserver(([m]) => {
      // Khuất VÀ nằm phía trên màn hình (đã cuộn qua) — không hiện khi nút còn ở dưới.
      setNutKhuat(!m.isIntersecting && m.boundingClientRect.top < 0);
    });
    qs.observe(el);
    return () => qs.disconnect();
  }, []);

  /**
   * Tồn kho — SỬA BUG-R08 (kiểm thử 05/08/2026).
   *
   * Trang chi tiết trước đây không hiện tồn kho, không có trạng thái còn/hết
   * hàng, và nút "+" không có trần: bấm 29 lần là đặt 30 chai, tương đương đơn
   * 69.900.000đ. Rượu vang nhiều chai mỗi năm chỉ nhập được vài chai — nhận đơn
   * rồi phải huỷ là rủi ro vận hành thật, không phải lỗi hiển thị.
   *
   * ⚠️ Số này vẫn là tồn kho GIẢ LẬP (xem `lib/ton-kho.ts`). Khi nối tồn kho
   * thật của Medusa thì đổi đúng một dòng dưới đây.
   */
  const tonKho = tonKhoThat(product.tonKho);
  const tranSoLuong = Math.min(99, tonKho.soLuong);

  const giam = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const thongSo: { k: string; giaTri?: string }[] = [
    { k: "product.spec_producer", giaTri: product.brand },
    { k: "product.spec_style", giaTri: product.category },
    { k: "product.spec_grape", giaTri: product.grape },
    { k: "product.spec_country", giaTri: product.origin },
    { k: "product.spec_region", giaTri: product.region },
    { k: "product.spec_volume", giaTri: product.volume },
    { k: "product.spec_abv", giaTri: product.abv },
    { k: "product.spec_sku", giaTri: product.sku },
  ].filter((t) => t.giaTri);

  const dauVaoNhan = {
    title: product.title,
    handle: product.handle,
    loai: product.category,
    tags: product.tags,
    giaVnd: product.price,
  };
  const dsNhan = layNhan(dauVaoNhan, 3);
  const huongVi = layHuongVi(dauVaoNhan);
  const monAn = layMonAn(dauVaoNhan);

  // Ưu đãi thùng chỉ áp cho chai lẻ, không áp cho thùng đóng sẵn (xem lib/khuyen-mai.ts).
  const laThungSan = /\b(pack|case|dozen|carton)\b/i.test(product.title);
  const giaMoiChai = Math.round((product.price * (100 - CHINH_SACH.phanTramThung)) / 100);
  const soChaiTrongGio = uuDai.thung.soChai;

  const xuatXu = [product.region, product.origin].filter(Boolean).join(", ");

  return (
    <div className="pb-24 lg:pb-0">
    {/* Hai cột Ảnh | Thông tin nằm trong MỘT lưới riêng. Cột ảnh dùng `sticky`; nếu để chung
        lưới với phần mô tả thì ảnh trượt xuống đè lên mô tả (lỗi vỡ layout đã gặp trên một sản phẩm
        thật). Tách ra thì ảnh chỉ dính trong phạm vi hai cột. */}
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-20">
      {/* ── Ảnh ─────────────────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-[120px] lg:self-start">
        <div className="the-sp__nen relative aspect-[4/5] w-full overflow-hidden">
          {anh[iAnh] ? (
            <AnhChai
              key={String(anh[iAnh])}
              src={anh[iAnh] as string}
              alt={product.title}
              fill
              sizes="(max-width: 1023px) 100vw, 55vw"
              priority
              className="hien-dan object-contain p-10 mix-blend-multiply sm:p-14"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[12px] uppercase tracking-[0.16em] text-ink-soft">
              <T k="common.image_coming_soon" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
            {dsNhan.includes("ban-chay") && (
              <span className="tag bg-ink text-page">
                <T k="badge.best_seller" />
              </span>
            )}
            {giam > 0 && <span className="tag bg-wine text-page">-{giam}%</span>}
          </div>
          {!laThungSan && (
            <span className="tag absolute right-4 top-4 border border-wine bg-page font-semibold text-wine">
              <T k="promo.badge_case" v={{ box: CHINH_SACH.chaiMoiThung, pct: CHINH_SACH.phanTramThung }} />
            </span>
          )}
        </div>

        {anh.length > 1 && (
          <div className="cuon-ngang mt-4 flex gap-3 overflow-x-auto pb-2">
            {anh.map((src, k) => (
              <button
                key={`${src}-${k}`}
                type="button"
                onClick={() => setIAnh(k)}
                aria-label={`Ảnh ${k + 1}`}
                aria-current={k === iAnh}
                className={`the-sp__nen relative h-24 w-20 shrink-0 border transition-colors duration-300 ${
                  k === iAnh ? "border-copper" : "border-transparent hover:border-line"
                }`}
              >
                <Anh
                  src={src as string}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-2 mix-blend-multiply"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Thông tin bán hàng ──────────────────────────────────────────── */}
      <div className="lg:pt-4">
        {product.brand && <p className="nhan-nho">{product.brand}</p>}
        <NhanSanPham nhan={dsNhan} className="mt-3" />

        <h1 className="mt-3 text-[38px] font-normal leading-[1.08] md:text-[52px]">
          {product.title}
        </h1>

        {(xuatXu || product.volume) && (
          <p className="mt-4 text-[14px] tracking-wide text-ink-muted">
            {[xuatXu, product.volume].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[30px] font-medium tabular-nums leading-none text-ink">
            <Tien so={product.price} />
          </span>
          {giam > 0 && product.originalPrice && (
            <span className="text-[16px] tabular-nums text-ink-soft line-through">
              <Tien so={product.originalPrice} />
            </span>
          )}
        </div>

        {/* Trạng thái tồn kho — SỬA BUG-R08 */}
        <p className="mt-5 flex items-center gap-2.5 text-[13px] text-ink-muted">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              !tonKho.conHang ? "bg-ink-soft" : tonKho.sapHet ? "bg-wine" : "bg-copper"
            }`}
          />
          {!tonKho.conHang ? (
            <T k="product.out_of_stock" />
          ) : tonKho.sapHet ? (
            <span className="font-medium text-wine">
              <T k="product.only_bottles_left" v={{ soLuong: tonKho.soLuong }} />
            </span>
          ) : (
            <T k="product.in_stock_bottles" v={{ soLuong: tonKho.soLuong }} />
          )}
        </p>

        {/* Ưu đãi thùng 6 chai — dẫn sang giỏ hàng, nói rõ giỏ đang có bao nhiêu chai */}
        {!laThungSan && (
          <Link
            href="/gio-hang"
            className="group mt-6 flex items-center gap-3 border border-line bg-cream p-3.5 no-underline transition-colors duration-200 hover:border-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine active:border-wine motion-reduce:transition-none"
          >
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0 text-wine" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="8" width="18" height="12" />
              <path d="M3 12h18M9 8v12M15 8v12" />
            </svg>
            <span className="min-w-0 flex-1 text-[13px] leading-relaxed">
              <span className="block font-semibold text-ink">
                <T k="promo.case_title" v={{ box: CHINH_SACH.chaiMoiThung, pct: CHINH_SACH.phanTramThung }} />
              </span>
              <span className="block text-ink-muted">
                <T k="promo.case_per_bottle" v={{ gia: tienSong(giaMoiChai) }} />
                {daTaiXong && soChaiTrongGio > 0 && (
                  <>
                    {" "}
                    {uuDai.thung.chaiConThieu === 0 ? (
                      <T k="promo.case_done" v={{ box: CHINH_SACH.chaiMoiThung }} />
                    ) : (
                      <T k="promo.case_cart_has" v={{ n: soChaiTrongGio }} />
                    )}
                  </>
                )}
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-wine transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        )}

        {huongVi && (
          <div className="mt-7 border-l-2 border-copper pl-4">
            <p className="nhan-nho !mb-1">
              <T k="product.taste" />
            </p>
            <p className="text-[15px] leading-relaxed text-ink">
              <T k={huongVi} />
            </p>
            <p className="mt-1 text-[12px] text-ink-soft">
              <T k="product.a_general_guide_to_the" />
            </p>
          </div>
        )}

        {monAn && (
          <section aria-label={t("product.pairing")} className="mt-7">
            <h2 className="nhan-nho mb-3 !font-sans">
              <T k="product.pairing" />
            </h2>
            <LBlock
              values={theoNgonNgu((l) => (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {translate(l, monAn)
                    .split("|")
                    .map((x) => (
                      <li key={x} className="border border-[#CFC4B3] px-3 py-2 text-[13px] leading-none text-ink">
                        {x}
                      </li>
                    ))}
                </ul>
              ))}
            />
          </section>
        )}

        {/* Chọn số lượng + thêm giỏ */}
        <div ref={nutChinh} className="mt-8 flex flex-wrap items-stretch gap-3 max-lg:hidden">
          <div className="flex items-stretch border border-ink/25">
            <button
              type="button"
              onClick={() => setSoLuong((n) => Math.max(1, n - 1))}
              disabled={!tonKho.conHang}
              aria-label="Giảm số lượng"
              className="w-12 text-[18px] text-ink-muted transition-colors hover:bg-stone disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              /* SỬA BUG-R08: ô nhập cũ không có `max`, gõ tay 500 cũng lọt. */
              max={tranSoLuong || 1}
              value={soLuong}
              disabled={!tonKho.conHang}
              onChange={(e) =>
                setSoLuong(
                  Math.min(
                    tranSoLuong || 1,
                    Math.max(1, Number(e.target.value) || 1)
                  )
                )
              }
              aria-label="Số lượng"
              className="w-14 border-x border-ink/25 bg-transparent text-center text-[15px] font-medium tabular-nums text-ink outline-none [appearance:textfield] disabled:bg-stone [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setSoLuong((n) => Math.min(tranSoLuong, n + 1))}
              disabled={!tonKho.conHang || soLuong >= tranSoLuong}
              aria-label="Tăng số lượng"
              className="w-12 text-[18px] text-ink-muted transition-colors hover:bg-stone disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          {tonKho.conHang ? (
            <NutThemVaoGio
              product={product}
              soLuong={soLuong}
              className="btn-wine min-w-[220px] flex-1"
            />
          ) : (
            <button
              type="button"
              disabled
              className="btn-wine min-w-[220px] flex-1 cursor-not-allowed opacity-60"
            >
              <T k="product.out_of_stock" />
            </button>
          )}
        </div>

        {tonKho.conHang && soLuong >= tranSoLuong && (
          <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
            <T k="product.that_s_every_bottle_we" v={{ hotline: HE_THONG_CUA_HANG.hotline }} />
          </p>
        )}

        <Link
          href="/gio-hang"
          className="lien-ket mt-5 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-wine max-lg:hidden"
        >
          <T k="product.view_cart" />
        </Link>

        {/* Cam kết bán hàng */}
        <ul className="mt-10 space-y-4 border-t border-line pt-8 text-[14px] leading-relaxed text-ink-muted">
          <li className="flex items-start gap-3.5">
            <Bieu d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Zm-3 9 2.2 2.2L15.5 10" />
            <T k="product.authentic_imported_wine_with_full" />
          </li>
          <li className="flex items-start gap-3.5">
            <Bieu d="M3 6.5h11v9H3v-9Zm11 3h4l3 3v3h-7v-6ZM7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <T k="product.collect_at_any_of_our" v={{ SO_CUA_HANG }} />
          </li>
          {HE_THONG_CUA_HANG.hotline && (
            <li className="flex items-start gap-3.5">
              <Bieu d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4v-10Z" />
              <T k="product.wine_advice" v={{ hotline: HE_THONG_CUA_HANG.hotline }} />
            </li>
          )}
          <li className="flex items-start gap-3.5">
            <Bieu d="M12 8v5m0 3.5v.01M12 3.5 21 19H3L12 3.5Z" />
            <T k="product.not_sold_to_anyone_under" />
          </li>
        </ul>

        {/* Thông số */}
        {thongSo.length > 0 && (
          <details className="group mt-8 border-b border-line lg:hidden">
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between text-[12px] font-semibold uppercase tracking-[0.1em] text-ink [&::-webkit-details-marker]:hidden">
              <T k="product.product_details" />
              <span aria-hidden="true" className="text-[18px] font-normal leading-none text-ink-muted group-open:hidden">+</span>
              <span aria-hidden="true" className="hidden text-[18px] font-normal leading-none text-ink-muted group-open:inline">−</span>
            </summary>
            <dl className="m-0 flex flex-col gap-2.5 pb-4 text-[13px]">
              {thongSo.map((x) => (
                <div key={x.k} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">
                    <T k={x.k} />
                  </dt>
                  <dd className="m-0 text-right text-ink">{x.giaTri}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {thongSo.length > 0 && (
          <div className="mt-10 max-lg:hidden">
            <h2 className="nhan-nho mb-2 !font-sans">
              <T k="product.product_details" />
            </h2>
            <dl>
              {thongSo.map((t) => (
                <div
                  key={t.k}
                  className="grid grid-cols-[2fr_3fr] gap-4 border-b border-line py-3.5 text-[14px]"
                >
                  <dt className="text-ink-muted">
                    <T k={t.k} />
                  </dt>
                  <dd className="text-ink">{t.giaTri}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {ghepCung.length > 0 && (
          <section aria-label={t("product.often_together")} className="mt-10">
            <h2 className="nhan-nho mb-3 !font-sans">
              <T k="product.often_together" />
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
              {ghepCung.slice(0, 2).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/san-pham/${p.handle}`}
                    className="flex h-full flex-col gap-1.5 border border-line bg-cream p-3 no-underline transition-colors hover:border-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                  >
                    <span className="the-sp__nen relative block h-24 overflow-hidden">
                      {p.thumbnail && (
                        <AnhChai src={p.thumbnail} alt="" fill sizes="160px" className="object-contain p-2 mix-blend-multiply" />
                      )}
                    </span>
                    <span className="dong-2 font-display text-[16px] leading-tight text-ink">{p.title}</span>
                    <span className="mt-auto text-[13px] font-semibold tabular-nums text-ink"><Tien so={p.price} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

    </div>

      {/* ── Mô tả ───────────────────────────────────────────────────────── */}
      {(Object.keys(product.descriptions ?? {}).length > 0 || product.description) && (
        <div className="mt-12 border-t border-line pt-12 lg:mt-20 lg:pt-16">
          <div className="mx-auto max-w-prose2">
            <h2 className="mb-6 text-center text-[32px] md:text-[40px]">
              <T k="product.about_this_wine" />
            </h2>
            <span className="mx-auto mb-8 block h-px w-14 bg-copper" aria-hidden="true" />
            {/* Mô tả từ site gốc đã được crawler bóc hết thẻ HTML, giữ xuống dòng
                bằng "\n" — tách theo dòng trống để ra đoạn văn thật. */}
            <LBlock
              className="space-y-5 text-[16px] leading-[1.9] text-ink-muted"
              values={theoNgonNgu((l) =>
                (product.descriptions?.[l] || product.descriptions?.[DEFAULT_LOCALE] || product.description)
                  .split(/\n{2,}/)
                  .map((doan) => doan.trim())
                  .filter(Boolean)
                  .map((doan, k) => <p key={k}>{doan}</p>)
              )}
            />
          </div>
        </div>
      )}

      {/* Thanh dính đáy (mobile/tablet): số lượng + Thêm vào giỏ kèm giá, luôn trong tầm ngón cái */}
      <div
        data-thanh-duoi=""
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream shadow-[0_-6px_20px_rgba(28,26,25,0.06)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="container-site flex items-center gap-3 py-3">
          <div className="flex shrink-0 items-stretch border border-[#CFC4B3]">
            <button
              type="button"
              onClick={() => setSoLuong((n) => Math.max(1, n - 1))}
              disabled={!tonKho.conHang || soLuong <= 1}
              aria-label={t("product.qty_dec")}
              className="h-12 w-9 text-[18px] text-ink-muted transition-colors active:bg-stone disabled:opacity-40"
            >
              −
            </button>
            <span className="grid w-8 place-items-center text-[14px] font-medium tabular-nums text-ink" aria-live="polite">
              {soLuong}
            </span>
            <button
              type="button"
              onClick={() => setSoLuong((n) => Math.min(tranSoLuong, n + 1))}
              disabled={!tonKho.conHang || soLuong >= tranSoLuong}
              aria-label={t("product.qty_inc")}
              className="h-12 w-9 text-[18px] text-ink-muted transition-colors active:bg-stone disabled:opacity-40"
            >
              +
            </button>
          </div>
          {tonKho.conHang ? (
            <NutThemVaoGio
              product={product}
              soLuong={soLuong}
              hauTo={<> · <Tien so={product.price * soLuong} /></>}
              className="btn-wine !min-h-[50px] min-w-0 flex-1 whitespace-nowrap !px-2 !text-[12px] !tracking-[0.06em]"
            />
          ) : (
            <button type="button" disabled className="btn-wine !min-h-[50px] min-w-0 flex-1 cursor-not-allowed opacity-60">
              <T k="product.out_of_stock" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
