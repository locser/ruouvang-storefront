"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnhChai from "@/components/AnhChai";
import { DauBatBuoc, LoiO } from "@/components/BieuMau";
import T, { Tien } from "@/components/T";
import { useT } from "@/i18n/use-t";
import { useGioHang } from "@/lib/gio-hang-context";
import KhungMaGiamGia from "@/components/khuyen-mai/KhungMaGiamGia";
import { luuDonVuaDat, taoMaDonHang, type DonVuaDat } from "@/lib/don-hang";
import { chuyenKhoanSanSang } from "@/lib/chuyen-khoan";
import { useNganHang } from "@/lib/cai-dat-context";

/**
 * Trang đặt hàng.
 *
 * Các lỗi đã chữa theo báo cáo kiểm thử 05/08/2026:
 *
 *   · BUG-R04 — câu chữ còn sót của template mỹ phẩm Hasaki ("ĐƠN HÀNG MỸ PHẨM
 *     CHÍNH HÃNG", "Mời anh/chị chọn mỹ phẩm chính hãng"). Khách đang mua chai
 *     rượu vài triệu mà thấy chữ "mỹ phẩm" ở đúng bước thanh toán sẽ nghĩ đây
 *     là website giả mạo.
 *   · BUG-R21 — ba ô thông tin giao hàng điền sẵn tên, số điện thoại và địa chỉ
 *     THẬT của một người. Nay để trống hoàn toàn.
 *   · BUG-R23 — ô số điện thoại nhận mọi ký tự. Nay kiểm tra theo định dạng số
 *     Việt Nam, có thông báo lỗi tiếng Việt.
 *   · BUG-R05 — chọn phương thức giao hàng không làm đổi khối tóm tắt đơn.
 *   · BUG-R26/R27 — mã đơn hàng gán cứng, trang xác nhận không có thông tin đơn.
 *   · BUG-R33 — trạng thái "đang tải" không có thẻ H1 nên trình thu thập đo được
 *     một trang không H1.
 */

/** Hai phương thức giao hàng — tên và phí lấy đúng như site đang công bố. */
const CACH_GIAO = [
  {
    ma: "tieu-chuan",
    ten: "Giao hàng tiêu chuẩn",
    khoaTen: "checkout.ship_standard_name",
    moTa: "Dự kiến 2-4 ngày làm việc, áp dụng toàn quốc",
    khoaMoTa: "checkout.ship_standard_desc",
    phi: 50000,
  },
] as const;

interface CachTra {
  ma: "cod" | "chuyen-khoan";
  ten: string;
  khoaTen: string;
  moTa: string;
  khoaMoTa: string;
}

/** COD luôn có; chuyển khoản chỉ hiện khi shop đã khai tài khoản nhận tiền (lib/chuyen-khoan.ts). */
const cachTraKhaDung = (coChuyenKhoan: boolean): readonly CachTra[] => [
  {
    ma: "cod",
    ten: "Thanh toán khi nhận hàng (COD)",
    khoaTen: "checkout.pay_cod_name",
    moTa: "Kiểm tra chai và tem nhập khẩu trước khi thanh toán",
    khoaMoTa: "checkout.pay_cod_desc",
  },
  ...(coChuyenKhoan
    ? [
        {
          ma: "chuyen-khoan" as const,
          ten: "Chuyển khoản ngân hàng (QR)",
          khoaTen: "checkout.pay_bank_name",
          moTa: "Quét mã QR hoặc chuyển thủ công; đơn được xác nhận sau khi nhận tiền",
          khoaMoTa: "checkout.pay_bank_desc",
        },
      ]
    : []),
];

/**
 * Số điện thoại Việt Nam: bắt đầu bằng 0 (10 số) hoặc +84/84 (9 số sau mã).
 * Cho phép khoảng trắng, dấu chấm và dấu gạch nối khi khách gõ.
 */
const RE_DIEN_THOAI = /^(?:\+?84|0)(?:\d{9})$/;

/** Email: chỉ kiểm cấu trúc cơ bản — máy chủ mới là nơi quyết định cuối. */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sachSoDienThoai(s: string): string {
  return s.replace(/[\s.\-()]/g, "");
}

export default function CheckoutPage() {
  const router = useRouter();
  const t = useT();
  const nganHang = useNganHang();
  const CACH_TRA = useMemo(() => cachTraKhaDung(chuyenKhoanSanSang(nganHang)), [nganHang]);
  const {
    danhSach,
    daTaiXong,
    tongTien,
    tongGiamGia,
    tongSoLuong,
    xoaHet,
    maGiamGia,
    uuDai,
  } = useGioHang();

  const [maGiao, setMaGiao] = useState<string>(CACH_GIAO[0].ma);
  const [maTra, setMaTra] = useState<string>(CACH_TRA[0].ma);

  // ── Thông tin giao hàng — SỬA BUG-R21: KHÔNG điền sẵn bất cứ giá trị nào ──
  const [hoTen, setHoTen] = useState("");
  const [dienThoai, setDienThoai] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [email, setEmail] = useState("");
  const [du18, setDu18] = useState(false);
  const bieuMau = useRef<HTMLFormElement>(null);
  const loiChotRef = useRef<HTMLParagraphElement>(null);
  const [loi, setLoi] = useState<Record<string, string>>({});
  const [dangGui, setDangGui] = useState(false);
  const [loiChot, setLoiChot] = useState("");
  // Đơn đã tạo xong, đang chờ `router.push` tải trang kế tiếp. Trong lúc đó giỏ đã bị
  // `xoaHet()` làm rỗng, nên không có cờ này thì trang vẽ lại thành "giỏ hàng trống"
  // (cảm giác như mất đơn) đến khi trang chuyển khoản tải xong.
  const [daDatXong, setDaDatXong] = useState(false);

  const cachGiaoDangChon =
    CACH_GIAO.find((c) => c.ma === maGiao) ?? CACH_GIAO[0];
  const cachTraDangChon = CACH_TRA.find((c) => c.ma === maTra) ?? CACH_TRA[0];

  // SỬA BUG-R05: tổng cộng tính lại theo phí của phương thức ĐANG chọn.
  // Tổng lấy từ bộ tính ưu đãi chung: đã trừ mã giảm (kể cả phí giao) và phí giao hiện hành.
  const phaiTra = uuDai.tongThanhToan;

  const nhanNutDatHang =
    cachTraDangChon.ma === "chuyen-khoan" ? "checkout.btn_place_transfer" : "checkout.btn_place_order";

  /** Kiểm tra ba ô thông tin. Trả về true nếu hợp lệ. */
  const kiemTraForm = (): boolean => {
    const moi: Record<string, string> = {};

    if (hoTen.trim().length < 2) {
      moi.hoTen = "checkout.err_name_required";
    }

    const sdt = sachSoDienThoai(dienThoai);
    if (!sdt) {
      moi.dienThoai = "checkout.err_phone_required";
    } else if (!RE_DIEN_THOAI.test(sdt)) {
      moi.dienThoai = "checkout.err_phone_format";
    }

    if (diaChi.trim().length < 10) {
      moi.diaChi = "checkout.err_address_incomplete";
    }

    if (email.trim() && !RE_EMAIL.test(email.trim())) {
      moi.email = "checkout.err_email_format";
    }

    if (!du18) {
      moi.du18 = "checkout.err_age_required";
    }

    setLoi(moi);

    // Đưa khách tới ô lỗi đầu tiên (scroll-padding của <html> chừa chỗ cho header).
    const thuTu = ["hoTen", "dienThoai", "email", "diaChi", "du18"];
    const dau = thuTu.find((k) => moi[k]);
    if (dau) {
      const id = { hoTen: "ho-ten", dienThoai: "dien-thoai", email: "email", diaChi: "dia-chi", du18: "du-18-tuoi" }[dau];
      requestAnimationFrame(() => bieuMau.current?.querySelector<HTMLElement>("#" + id)?.focus());
    }
    return Object.keys(moi).length === 0;
  };

  /** Chốt đơn qua Store API; chỉ chuyển trang sau khi Medusa trả order thật. */
  const hoanTatDonHang = async () => {
    setDangGui(true);
    setLoiChot("");
    try {
      const response = await fetch("/api/dat-hang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoTen: hoTen.trim(),
          dienThoai: sachSoDienThoai(dienThoai),
          diaChi: diaChi.trim(),
          email: email.trim(),
          phuongThucThanhToan: cachTraDangChon.ma,
          monHang: danhSach.map((m) => ({
            handle: m.handle,
            sku: m.sku,
            soLuong: m.soLuong,
          })),
          maGiamGia: maGiamGia ?? "",
        }),
      });
      const ketQua = await response.json();
      if (!response.ok || !ketQua?.ok || !ketQua?.donHang) {
        throw new Error(ketQua?.loi || "checkout.err_order_retry");
      }
      const donMedusa = ketQua.donHang as {
        ma: string;
        tamTinh: number;
        phiGiaoHang: number;
        giamMa: number;
        tongThanhToan: number;
        giaoHang: string;
        monHang: DonVuaDat["monHang"];
      };
    const don: DonVuaDat = {
      maDon: donMedusa.ma || taoMaDonHang(),
      datLuc: new Date().toISOString(),
      hoTen: hoTen.trim(),
      dienThoai: sachSoDienThoai(dienThoai),
      diaChi: diaChi.trim(),
      giaoHang: donMedusa.giaoHang || cachGiaoDangChon.ten,
      phiGiaoHang: donMedusa.phiGiaoHang,
      thanhToan: cachTraDangChon.ten,
      phuongThuc: cachTraDangChon.ma,
      monHang:
        donMedusa.monHang.length > 0
          ? donMedusa.monHang
          : danhSach.map((m) => ({
              title: m.title,
              sku: m.sku,
              soLuong: m.soLuong,
              thanhTien: m.price * m.soLuong,
            })),
      tamTinh: donMedusa.tamTinh,
      maGiamGia: maGiamGia,
      tienGiamMa: donMedusa.giamMa,
      tongThanhToan: donMedusa.tongThanhToan,
    };

    luuDonVuaDat(don);
    setDaDatXong(true);
    xoaHet();
    // Chuyển khoản: đơn đã tạo nhưng CHƯA có tiền — sang trang chờ thanh toán.
    router.push(
      cachTraDangChon.ma === "chuyen-khoan" ? "/thanh-toan/chuyen-khoan" : "/dat-hang-thanh-cong"
    );
    } catch (error) {
      setLoiChot(error instanceof Error ? error.message : "checkout.err_order_generic");
      // Nút đặt hàng không nằm cạnh chỗ báo lỗi: kéo khách tới thông báo rồi đọc to nó.
      requestAnimationFrame(() => {
        loiChotRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        loiChotRef.current?.focus({ preventScroll: true });
      });
    } finally {
      setDangGui(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kiemTraForm()) return;
    await hoanTatDonHang();
  };

  // Chưa đọc xong localStorage. Vẫn phải có H1 — SỬA BUG-R33.
  if (!daTaiXong || daDatXong) {
    return (
      <div className="container-site py-10 md:py-16">
        <TieuDe />
        <p className="py-24 text-center font-display text-[24px] italic text-ink-muted">
          <T k="checkout.loading_order" />
        </p>
      </div>
    );
  }

  // Giỏ rỗng thì không cho thanh toán.
  if (danhSach.length === 0) {
    return (
      <div className="container-site py-10 md:py-16">
        <TieuDe />
        <div className="mx-auto max-w-lg border-y border-line py-16 text-center">
          <h2 className="m-0 text-[30px] font-normal"><T k="checkout.empty_title" /></h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-[1.8] text-ink-muted">
            <T k="checkout.empty_text" />
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/danh-muc/welcome20-discount" className="btn-wine">
              <T k="checkout.btn_explore" />
            </Link>
            <Link href="/" className="btn-wine-outline">
              <T k="checkout.btn_home" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Đáy trang chừa chỗ cho thanh đặt hàng cố định ở mobile/tablet (`lg:hidden`).
    <div className="container-site pb-32 pt-10 md:pt-16 lg:pb-16">
      <TieuDe />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <form id="form-dat-hang" ref={bieuMau} onSubmit={handleSubmit} noValidate>
          <p className="mb-8 text-[14px] text-ink-muted">
            <T k="checkout.required_before" /> <span className="font-medium text-wine" aria-hidden="true">*</span>
            <span className="sr-only"><T k="checkout.star_sr" /></span> <T k="checkout.required_after" />
          </p>

          {/* 1 · Giao hàng */}
          <section>
            <BuocTieuDe so="1" ten="checkout.step_shipping" />

            <div role="group" aria-label={t("checkout.aria_ship_method")} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CACH_GIAO.map((c) => {
                const chon = maGiao === c.ma;
                return (
                  <button
                    key={c.ma}
                    type="button"
                    onClick={() => setMaGiao(c.ma)}
                    aria-pressed={chon}
                    className={`relative min-h-[44px] cursor-pointer border py-4 pl-5 pr-12 text-left text-[14px] transition-colors duration-300 ${
                      chon
                        ? "border-wine bg-wine-pale ring-1 ring-wine"
                        : "border-line-strong bg-cream hover:border-wine"
                    }`}
                  >
                    <span className="block font-medium text-ink"><T k={c.khoaTen} /></span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                      <T k={c.khoaMoTa} /> — <Tien so={c.phi} />
                    </span>
                    {/* Dấu tick: trạng thái "đã chọn" không chỉ dựa vào màu nền (WCAG 1.4.1). */}
                    {chon && (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute right-4 top-4 h-5 w-5 text-wine"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-6">
              <label htmlFor="ho-ten" className="nhan-form">
                <T k="checkout.field_name" /> <DauBatBuoc />
              </label>
              <input
                id="ho-ten"
                name="ho_ten"
                type="text"
                required
                autoComplete="name"
                value={hoTen}
                onChange={(e) => {
                  setHoTen(e.target.value);
                  if (loi.hoTen) setLoi((l) => ({ ...l, hoTen: "" }));
                }}
                placeholder={t("checkout.ph_name")}
                aria-invalid={!!loi.hoTen}
                aria-describedby={loi.hoTen ? "loi-ho-ten" : undefined}
                className="o-nhap"
              />
              {loi.hoTen && <LoiO id="loi-ho-ten"><T k={loi.hoTen} /></LoiO>}
            </div>

            <div className="mb-6">
              <label htmlFor="dien-thoai" className="nhan-form">
                <T k="checkout.field_phone" /> <DauBatBuoc />
              </label>
              <input
                id="dien-thoai"
                name="dien_thoai"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                maxLength={15}
                /* SỬA BUG-R23: chặn ngay ở tầng trình duyệt, không chỉ bằng JavaScript. */
                pattern="(\+?84|0)[0-9]{9}"
                value={dienThoai}
                onChange={(e) => {
                  setDienThoai(e.target.value);
                  if (loi.dienThoai) setLoi((l) => ({ ...l, dienThoai: "" }));
                }}
                placeholder={t("checkout.ph_phone")}
                aria-invalid={!!loi.dienThoai}
                aria-describedby={loi.dienThoai ? "loi-dien-thoai" : "goi-y-dien-thoai"}
                className="o-nhap"
              />
              {loi.dienThoai ? (
                <LoiO id="loi-dien-thoai"><T k={loi.dienThoai} /></LoiO>
              ) : (
                <p id="goi-y-dien-thoai" className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                  <T k="checkout.hint_phone" />
                </p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="nhan-form">
                <T k="checkout.field_email" /> <span className="font-normal text-ink-muted"><T k="checkout.optional" /></span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loi.email) setLoi((l) => ({ ...l, email: "" }));
                }}
                placeholder="ten@gmail.com"
                aria-invalid={!!loi.email}
                aria-describedby={loi.email ? "loi-email" : "goi-y-email"}
                className="o-nhap"
              />
              {loi.email ? (
                <LoiO id="loi-email"><T k={loi.email} /></LoiO>
              ) : (
                <p id="goi-y-email" className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                  <T k="checkout.hint_email" />
                </p>
              )}
            </div>

            <div>
              <label htmlFor="dia-chi" className="nhan-form">
                <T k="checkout.field_address" /> <DauBatBuoc />
              </label>
              <textarea
                id="dia-chi"
                name="dia_chi"
                required
                rows={3}
                autoComplete="street-address"
                value={diaChi}
                onChange={(e) => {
                  setDiaChi(e.target.value);
                  if (loi.diaChi) setLoi((l) => ({ ...l, diaChi: "" }));
                }}
                placeholder={t("checkout.ph_address")}
                aria-invalid={!!loi.diaChi}
                aria-describedby={loi.diaChi ? "loi-dia-chi" : undefined}
                className="o-nhap"
              />
              {loi.diaChi && <LoiO id="loi-dia-chi"><T k={loi.diaChi} /></LoiO>}
            </div>
          </section>

          {/* 2 · Thanh toán */}
          <section className="mt-14">
            <BuocTieuDe so="2" ten="checkout.step_payment" />
            <fieldset className="m-0 min-w-0 space-y-3 border-0 p-0">
              <legend className="sr-only"><T k="checkout.pay_method_legend" /></legend>
              {CACH_TRA.map((c) => {
                const chon = maTra === c.ma;
                return (
                  <label
                    key={c.ma}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-4 border px-5 py-4 transition-colors duration-300 ${
                      chon
                        ? "border-wine bg-wine-pale ring-1 ring-wine"
                        : "border-line-strong bg-cream hover:border-wine"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pm"
                      value={c.ma}
                      checked={chon}
                      onChange={() => setMaTra(c.ma)}
                      className="h-5 w-5 shrink-0 accent-wine"
                    />
                    <span>
                      <span className="block text-[14px] font-medium text-ink"><T k={c.khoaTen} /></span>
                      <span className="mt-0.5 block text-[13px] text-ink-muted"><T k={c.khoaMoTa} /></span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </section>

          {/* Cả khối là <label>: bấm đâu trong ô (≥ 44px) cũng tick được — WCAG 2.5.5. */}
          <div className="mt-10">
            <label
              className={`flex min-h-[44px] cursor-pointer items-start gap-3 border bg-cream p-4 text-[14px] leading-relaxed text-ink ${
                loi.du18 ? "border-wine ring-1 ring-wine" : "border-line-strong"
              }`}
            >
              <input
                id="du-18-tuoi"
                type="checkbox"
                required
                checked={du18}
                onChange={(e) => {
                  setDu18(e.target.checked);
                  if (loi.du18) setLoi((l) => ({ ...l, du18: "" }));
                }}
                aria-invalid={!!loi.du18}
                aria-describedby={loi.du18 ? "loi-du-18" : undefined}
                className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-wine"
              />
              <span>
                <T k="checkout.age_confirm" /> <DauBatBuoc />
              </span>
            </label>
            {loi.du18 && <LoiO id="loi-du-18">{loi.du18}</LoiO>}
          </div>

          {/* Lỗi từ máy chủ nằm ở cuối form; nút đặt hàng ở thanh dưới/cột tóm tắt nên đưa
              focus về đây khi có lỗi để khách không phải đoán. */}
          {loiChot && (
            <p
              ref={loiChotRef}
              tabIndex={-1}
              role="alert"
              className="mt-8 flex items-start gap-2 border-l-2 border-wine pl-4 text-[14px] font-medium text-wine outline-none"
            >
              {loiChot.startsWith("checkout.") ? <T k={loiChot} /> : loiChot}
            </p>
          )}
        </form>

        <aside
          aria-label={t("checkout.aria_summary")}
          className="h-fit border border-line bg-cream p-7 lg:sticky lg:top-[120px] lg:p-9"
        >
          <h2 className="m-0 text-[28px] font-normal"><T k="checkout.summary_title" /></h2>
          <p className="mt-1 text-[13px] text-ink-soft"><T k="checkout.items_count" v={{ soLuong: tongSoLuong }} /></p>
          <span className="my-5 block h-px w-10 bg-copper" aria-hidden="true" />

          <ul className="m-0 list-none space-y-5 p-0 text-[14px]">
            {danhSach.map((mon) => (
              <li key={mon.id} className="flex items-center gap-4">
                <span className="the-sp__nen relative block h-[84px] w-[63px] shrink-0">
                  <AnhChai
                    src={mon.thumbnail}
                    alt=""
                    fill
                    sizes="63px"
                    className="object-contain p-1.5 mix-blend-multiply"
                  />
                  <span className="absolute -right-2 -top-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ink px-1 text-[11px] font-medium tabular-nums text-page">
                    {mon.soLuong}
                  </span>
                </span>
                <span className="dong-2 min-w-0 flex-1 font-ten text-[18px] leading-tight text-ink">
                  {mon.title}
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  <Tien so={mon.price * mon.soLuong} />
                </span>
              </li>
            ))}
          </ul>

          {/* Mã giảm giá nhập ở đây, trước khi đặt hàng: Medusa tính số tiền thật theo mã này. */}
          <div className="mt-5">
            <KhungMaGiamGia />
          </div>

          <div className="mt-5 space-y-3.5 border-t border-line pt-5 text-[14px]">
            {tongGiamGia > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-muted"><T k="checkout.discount_label" /></span>
                <span className="shrink-0 tabular-nums text-wine">
                  −<Tien so={tongGiamGia} />
                </span>
              </div>
            )}

            {uuDai.giamMa > 0 && (
              <div className="flex justify-between gap-3">
                <span className="text-ink-muted">Mã {uuDai.ma?.ma.ma}</span>
                <span className="shrink-0 tabular-nums text-wine">
                  −<Tien so={uuDai.giamMa} />
                </span>
              </div>
            )}

            {/* SỬA BUG-R05: dòng phí đọc thẳng từ phương thức khách vừa chọn; đã trừ phần giảm phí giao nếu có. */}
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted"><T k={cachGiaoDangChon.khoaTen} /></span>
              <span className="shrink-0 tabular-nums text-ink">
                <Tien so={uuDai.phiGiao} />
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-5">
              <span className="text-[13px] font-medium uppercase tracking-caps text-ink">
                <T k="checkout.total" />
              </span>
              <span aria-live="polite" className="shrink-0 text-[24px] font-medium tabular-nums text-ink">
                <Tien so={phaiTra} />
              </span>
            </div>
          </div>

          {/* Desktop: nút đặt hàng nằm ngay trong cột tóm tắt (dính theo cuộn), không phải cuộn xuống cuối form. */}
          <NutDatHang
            dangGui={dangGui}
            nhan={nhanNutDatHang}
            className="mt-7 hidden w-full lg:inline-flex"
          />

          <p className="mt-7 border-t border-line pt-6 text-[13px] leading-relaxed text-ink-muted">
            <T k="checkout.policy_note" />
          </p>
        </aside>
      </div>

      {/* Mobile/tablet: thanh đặt hàng dính đáy màn hình. `data-thanh-duoi` báo cho dock liên hệ
          lùi lên trên thanh này và chỉ giữ MỘT nút (xem globals.css), để không che tổng tiền/nút. */}
      <div
        data-thanh-duoi=""
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="container-site flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13px] text-ink-soft"><T k="checkout.total" /></p>
            <p className="m-0 text-[20px] font-medium tabular-nums leading-tight text-ink">
              <Tien so={phaiTra} />
            </p>
          </div>
          <NutDatHang dangGui={dangGui} nhan={nhanNutDatHang} className="shrink-0 !px-6" />
        </div>
      </div>
    </div>
  );
}

/** Nút gửi đơn nằm NGOÀI <form> (cột tóm tắt / thanh đáy), liên kết qua thuộc tính `form`. */
function NutDatHang({
  dangGui,
  nhan,
  className = "",
}: {
  dangGui: boolean;
  nhan: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      form="form-dat-hang"
      disabled={dangGui}
      aria-busy={dangGui}
      className={`btn-wine disabled:opacity-60 ${className}`}
    >
      {dangGui ? <T k="checkout.btn_processing" /> : <T k={nhan} />}
    </button>
  );
}

/** H1 của trang (luôn có — SỬA BUG-R33). */
function TieuDe() {
  return (
    <header className="mb-12 text-center md:mb-16">
      <p className="nhan-nho mb-4"><T k="checkout.eyebrow" /></p>
      <h1 className="tieu-de-section gach-tieu-de"><T k="checkout.title" /></h1>
    </header>
  );
}

function BuocTieuDe({ so, ten }: { so: string; ten: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-4 border-b border-ink/20 pb-4">
      {/* copper-ink (5,2:1) thay cho copper (2,8:1) — số bước là chữ, không phải đường kẻ. */}
      <span aria-hidden="true" className="font-display text-[32px] italic leading-none text-copper-ink">
        {so}
      </span>
      <h2 className="m-0 text-[28px] font-normal"><T k={ten} /></h2>
    </div>
  );
}
