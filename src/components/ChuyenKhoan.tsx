"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChaiVang, SpriteChai } from "@/components/cam-nang/ChaiVang";
import {
  CHU_KY_KIEM_TRA_MS,
  HAN_CHUYEN_KHOAN_PHUT,
  khoaHanCuaDon,
  kiemTraGiaoDich,
  nhomSoTaiKhoan,
  noiDungChuyenKhoan,
  urlVietQR,
  type KetQuaGiaoDich,
} from "@/lib/chuyen-khoan";
import { useNganHang, useZaloLink } from "@/lib/cai-dat-context";
import { docDonVuaDat, dinhDangThoiDiem, maHienThiDon, type DonVuaDat } from "@/lib/don-hang";
import { dinhDangTien } from "@/lib/tien";
import { LOI_VAO_CHINH } from "@/lib/dieu-huong";
import T, { Tien } from "@/components/T";
import { useLocale, useT } from "@/i18n/use-t";
import { tienSong } from "@/lib/tien";
import { moChatAI } from "@/lib/chat-ai";

/**
 * Trang chờ thanh toán chuyển khoản (`/thanh-toan/chuyen-khoan`).
 *
 * Đơn đã được tạo ở bước trước (đọc lại từ sessionStorage như trang xác nhận).
 * Ba trạng thái: chờ chuyển khoản · thành công · thất bại (hết hạn / chuyển thiếu).
 *
 * ⚠️ Việc "tiền đã về chưa" đi qua đúng MỘT hàm — `kiemTraGiaoDich` trong
 * lib/chuyen-khoan.ts — và hiện CHƯA nối ngân hàng, nên trạng thái thật luôn là
 * "chờ". Thêm `?demo=1` vào URL để hiện thanh chuyển qua lại giữa các trạng thái
 * khi duyệt giao diện; bản trình khách không có tham số này thì không có thanh đó.
 *
 * Trợ lý AI dùng chatbot thật của site (sự kiện `cwwines:mo-chat-ai` mà DockLienHe
 * lắng nghe), không có khung chat riêng ở trang này.
 */

type TrangThai = "cho" | "thanh-cong" | "that-bai";
type LyDo = "het-han" | "thieu";

const MAU_CHAI = ["#1B0A0E", "#3A1220", "#26110F"];
const HAN_MS = HAN_CHUYEN_KHOAN_PHUT * 60_000;

const dinhDangGio = (giay: number) => {
  const p = Math.floor(giay / 60);
  const s = giay % 60;
  return `${String(p).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ChuyenKhoan() {
  const t = useT();
  const NGAN_HANG = useNganHang();
  const zaloLink = useZaloLink();
  const locale = useLocale();
  const router = useRouter();
  const [don, setDon] = useState<DonVuaDat | null>(null);
  const [daDoc, setDaDoc] = useState(false);
  const [demo, setDemo] = useState(false);

  const [trangThai, setTrangThai] = useState<TrangThai>("cho");
  const [lyDo, setLyDo] = useState<LyDo>("het-han");
  const [han, setHan] = useState(0);
  const [conLai, setConLai] = useState(HAN_CHUYEN_KHOAN_PHUT * 60);
  /** Số tiền khách cần chuyển — bằng tổng đơn, hoặc phần còn thiếu khi chuyển bù. */
  const [soTien, setSoTien] = useState(0);
  const [daNhan, setDaNhan] = useState(0);
  const [lucNhan, setLucNhan] = useState<Date | null>(null);

  const [dangKiemTra, setDangKiemTra] = useState(false);
  const [thongBao, setThongBao] = useState("");
  const [docGio, setDocGio] = useState("");
  const [live, setLive] = useState("");
  const [qrLoi, setQrLoi] = useState(false);

  const tieuDeRef = useRef<HTMLHeadingElement>(null);
  const daVaoTrang = useRef(false);

  // ── Nạp đơn ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const d = docDonVuaDat();
    setDon(d);
    setDaDoc(true);
    if (!d) {
      router.replace("/gio-hang");
      return;
    }
    // Đơn COD không có gì để chuyển khoản — về trang xác nhận thường.
    if (d.phuongThuc !== "chuyen-khoan") {
      router.replace("/dat-hang-thanh-cong");
      return;
    }
    setSoTien(d.tongThanhToan);
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");

    let hanLuu = 0;
    try {
      hanLuu = Number(window.sessionStorage.getItem(khoaHanCuaDon(d.maDon))) || 0;
    } catch {
      /* không đọc được thì tính lại từ lúc đặt */
    }
    const moc = Date.parse(d.datLuc);
    setHan(hanLuu || (Number.isNaN(moc) ? Date.now() : moc) + HAN_MS);
  }, [router]);

  const chuyen = useCallback((tt: TrangThai, ld?: LyDo) => {
    setTrangThai(tt);
    if (ld) setLyDo(ld);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Đổi trạng thái → đưa focus về tiêu đề mới và đọc to cho trình đọc màn hình.
  useEffect(() => {
    if (!don) return;
    if (!daVaoTrang.current) {
      daVaoTrang.current = true;
      return;
    }
    tieuDeRef.current?.focus({ preventScroll: true });
    setThongBao("");
    setLive(
      trangThai === "thanh-cong"
        ? t("transfer.live_success", { ma: maHienThiDon(don.maDon) })
        : trangThai === "that-bai"
          ? lyDo === "het-han"
            ? t("transfer.live_expired")
            : t("transfer.live_partial")
          : t("transfer.live_waiting", { phut: HAN_CHUYEN_KHOAN_PHUT })
    );
    // `t` cố ý không đưa vào deps: đổi ngôn ngữ không được nhảy focus về tiêu đề.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trangThai, lyDo, don]);

  // ── Đồng hồ đếm ngược ────────────────────────────────────────────────────
  useEffect(() => {
    if (trangThai !== "cho" || !han) return;
    const tick = () => {
      const s = Math.ceil((han - Date.now()) / 1000);
      setConLai(Math.max(s, 0));
      if (s <= 0) chuyen("that-bai", "het-han");
      else if (s % 60 === 0) setDocGio(t("transfer.sr_minutes_left", { phut: s / 60 }));
      else if (s === 30 || s === 10) setDocGio(t("transfer.sr_seconds_left", { giay: s }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trangThai, han, chuyen, t]);

  const apDung = useCallback(
    (k: KetQuaGiaoDich) => {
      if (k.trangThai === "du") {
        setLucNhan(new Date());
        chuyen("thanh-cong");
      } else if (k.trangThai === "thieu") {
        setDaNhan(k.daNhan);
        chuyen("that-bai", "thieu");
      }
    },
    [chuyen]
  );

  // ── Tự hỏi lại trạng thái giao dịch khi đang chờ ─────────────────────────
  useEffect(() => {
    if (trangThai !== "cho" || !don) return;
    let huy = false;
    const id = setInterval(async () => {
      const k = await kiemTraGiaoDich(don.maDon);
      if (!huy) apDung(k);
    }, CHU_KY_KIEM_TRA_MS);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [trangThai, don, apDung]);

  const taoMaMoi = useCallback(
    (tien?: number) => {
      if (!don) return;
      const h = Date.now() + HAN_MS;
      try {
        window.sessionStorage.setItem(khoaHanCuaDon(don.maDon), String(h));
      } catch {
        /* hạn chỉ còn sống trong trang này — vẫn dùng được */
      }
      setHan(h);
      setConLai(HAN_CHUYEN_KHOAN_PHUT * 60);
      if (tien !== undefined) setSoTien(tien);
      setThongBao("");
      chuyen("cho");
    },
    [chuyen, don]
  );

  const kiemTraTay = async () => {
    if (!don || dangKiemTra) return;
    setDangKiemTra(true);
    setThongBao(t("transfer.status_checking"));
    const [k] = await Promise.all([kiemTraGiaoDich(don.maDon), nghi(700)]);
    setDangKiemTra(false);
    if (k.trangThai === "cho") {
      setThongBao(t("transfer.not_yet"));
    } else {
      setThongBao("");
      apDung(k);
    }
  };

  // ── Chưa có đơn ──────────────────────────────────────────────────────────
  if (!daDoc || !don) {
    return (
      <div className="container-site py-16">
        <div className="panel mx-auto max-w-xl px-4 py-14 text-center text-[14px] text-ink-muted">
          {daDoc ? <T k="transfer.not_found" /> : <T k="transfer.loading" />}
        </div>
      </div>
    );
  }

  const noiDung = noiDungChuyenKhoan(don.maDon);
  const tong = don.tongThanhToan;
  // Suy ra từ tổng thay vì tin `don.tamTinh`: Medusa trả `subtotal` đã gồm phí giao hàng, nên
  // hiện thẳng nó sẽ ra "tạm tính + phí ≠ tổng".
  const tamTinh = Math.max(tong - don.phiGiaoHang + don.tienGiamMa, 0);
  const conThieu = Math.max(tong - daNhan, 0);
  const urlQr = urlVietQR(soTien, noiDung, NGAN_HANG);
  const coQr = Boolean(urlQr) || NGAN_HANG.laMau;
  const sapHet = conLai <= 120;

  const demoDen = (tt: "cho" | "thanh-cong" | "het-han" | "thieu") => {
    if (tt === "cho") {
      setSoTien(tong);
      taoMaMoi(tong);
    } else if (tt === "thanh-cong") {
      setLucNhan(new Date());
      chuyen("thanh-cong");
    } else if (tt === "het-han") {
      chuyen("that-bai", "het-han");
    } else {
      setDaNhan(Math.round((tong * 0.68) / 1000) * 1000);
      chuyen("that-bai", "thieu");
    }
  };

  return (
    <div className="pb-16 pt-2">
      <SpriteChai />

      {demo && (
        <div className="nen-toi mb-4 bg-menubar text-[12px] text-[#CFC7BB]" role="region" aria-label={t("transfer.demo_region")}>
          <div className="container-site flex flex-wrap items-center gap-2 py-2.5">
            <b className="mr-1 font-semibold tracking-[0.14em] text-copper-light">DEMO</b>
            {(
              [
                ["cho", "transfer.demo_cho", trangThai === "cho"],
                ["thanh-cong", "transfer.demo_thanh_cong", trangThai === "thanh-cong"],
                ["het-han", "transfer.demo_het_han", trangThai === "that-bai" && lyDo === "het-han"],
                ["thieu", "transfer.demo_thieu", trangThai === "that-bai" && lyDo === "thieu"],
              ] as const
            ).map(([ma, nhan, dang]) => (
              <button
                key={ma}
                type="button"
                aria-pressed={dang}
                onClick={() => demoDen(ma)}
                className={`min-h-11 border px-3.5 transition-colors ${
                  dang
                    ? "border-copper-light bg-copper-light text-ink"
                    : "border-[#5a524c] text-page hover:border-copper-light"
                }`}
              >
                <T k={nhan} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container-site max-w-[1120px]">
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>
        <p className="sr-only" role="timer" aria-live="off">
          {docGio}
        </p>

        <div className="grid gap-8 pb-4 pt-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)] lg:items-start lg:gap-12 lg:pt-10">
          <div>
            {/* ══════════ ĐANG CHỜ ══════════ */}
            {trangThai === "cho" && (
              <section aria-labelledby="t-cho">
                <div className="nhan-nho"><T k="transfer.eyebrow" /></div>
                <h1
                  id="t-cho"
                  ref={tieuDeRef}
                  tabIndex={-1}
                  className="mb-2.5 mt-3 text-[clamp(34px,6vw,52px)] leading-[1.1] outline-none"
                >
                  <T k="transfer.title_waiting" />
                </h1>
                <p className="max-w-[520px] text-ink-muted">
                  <T k="transfer.intro_waiting" />
                </p>

                <div
                  className="mt-5 flex items-center gap-3 border border-line bg-cream px-4 py-3.5 text-[14px]"
                  aria-label={t("transfer.status_aria")}
                >
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-copper motion-reduce:animate-none" aria-hidden="true" />
                  <span><T k="transfer.status_waiting" /></span>
                  <span
                    aria-hidden="true"
                    className={`ml-auto text-[18px] font-semibold tabular-nums tracking-[0.02em] ${sapHet ? "text-bad" : "text-wine"}`}
                  >
                    {dinhDangGio(conLai)}
                  </span>
                </div>

                <div className={`mt-5 grid border border-line bg-cream ${coQr ? "sm:grid-cols-[240px_minmax(0,1fr)]" : ""}`}>
                  {coQr && (
                    <div className="flex flex-col items-center gap-3.5 border-b border-line p-5 sm:border-b-0 sm:border-r">
                      <div className="h-[196px] w-[196px] border border-line bg-white p-2.5">
                        {urlQr && !qrLoi ? (
                          // eslint-disable-next-line @next/next/no-img-element -- ảnh QR ngoài (VietQR), không qua loader ảnh của shop
                          <img
                            src={urlQr}
                            alt={t("transfer.qr_alt", { so: dinhDangTien(soTien, locale), nd: noiDung })}
                            width={176}
                            height={176}
                            onError={() => setQrLoi(true)}
                            className="h-full w-full object-contain"
                          />
                        ) : urlQr ? (
                          <p className="grid h-full place-items-center text-center text-[12px] leading-snug text-ink-muted">
                            <T k="transfer.qr_failed" />
                          </p>
                        ) : (
                          <QrMau />
                        )}
                      </div>
                      <small className="text-center text-[12px] leading-normal text-ink-soft">
                        <T k="transfer.qr_open_app" />
                        {!urlQr && (
                          <>
                            {" "}
                            <TheMau><T k="transfer.sample_qr" /></TheMau>
                          </>
                        )}
                      </small>
                      {urlQr && !qrLoi && (
                        <a
                          href={urlQr}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center px-3 text-[13px] font-semibold tracking-[0.06em] text-wine underline underline-offset-4"
                        >
                          <T k="transfer.qr_open_image" />
                        </a>
                      )}
                      {!urlQr && <LuuQrMau maDon={noiDung} />}
                    </div>
                  )}

                  <dl className="m-0 px-5 py-1.5">
                    <Dong nhan="transfer.lbl_bank">
                      {NGAN_HANG.ten}
                      {NGAN_HANG.laMau && <TheMau><T k="transfer.sample_tag" /></TheMau>}
                    </Dong>
                    <Dong nhan="transfer.lbl_account_no" chep={{ giaTri: NGAN_HANG.soTaiKhoan, khoaAria: "transfer.copy_account_aria" }}>
                      {nhomSoTaiKhoan(NGAN_HANG.soTaiKhoan)}
                    </Dong>
                    <Dong nhan="transfer.lbl_account_holder">{NGAN_HANG.chuTaiKhoan}</Dong>
                    <Dong nhan="transfer.lbl_amount" chep={{ giaTri: String(Math.round(soTien)), khoaAria: "transfer.copy_amount_aria" }}>
                      <Tien so={soTien} />
                    </Dong>
                    <Dong nhan="transfer.lbl_note" chep={{ giaTri: noiDung, khoaAria: "transfer.copy_note_aria" }} noiBat>
                      {noiDung}
                    </Dong>
                  </dl>
                </div>

                <p className="mt-4 border-l-[3px] border-copper bg-warn-bg px-4 py-3.5 text-[14px] leading-relaxed text-warn">
                  <b className="font-semibold"><T k="transfer.warn_exact" v={{ nd: noiDung }} /></b>{" "}
                  <T k="transfer.warn_exact_rest" />
                </p>

                <ol className="mt-6 grid list-none gap-3.5 p-0 text-[14px] text-ink-muted">
                  {[
                    "transfer.step_1",
                    "transfer.step_2",
                    "transfer.step_3",
                  ].map((b, i) => (
                    <li key={i} className="flex items-start gap-3.5">
                      <span
                        aria-hidden="true"
                        className="grid h-7 w-7 shrink-0 place-items-center border border-copper font-display text-[15px] lining-nums text-copper-ink"
                      >
                        {i + 1}
                      </span>
                      <T k={b} />
                    </li>
                  ))}
                </ol>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={kiemTraTay}
                    aria-busy={dangKiemTra}
                    disabled={dangKiemTra}
                    className="btn-wine aria-busy:cursor-progress"
                  >
                    {dangKiemTra ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
                        <T k="transfer.checking" />
                      </>
                    ) : (
                      <T k="transfer.btn_paid" />
                    )}
                  </button>
                  <Link href="/" className="btn-wine-outline">
                    <T k="transfer.btn_home" />
                  </Link>
                </div>
                <p className="mt-3.5 min-h-6 text-[14px] text-ink-muted" role="status" aria-live="polite">
                  {thongBao}
                </p>
              </section>
            )}

            {/* ══════════ THÀNH CÔNG ══════════ */}
            {trangThai === "thanh-cong" && (
              <section aria-labelledby="t-ok">
                <div className="flex flex-col gap-4">
                  <div className="grid h-[76px] w-[76px] place-items-center rounded-full border border-ok-line bg-ok-bg text-ok" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                  <div>
                    <div className="nhan-nho"><T k="transfer.eyebrow_success" /></div>
                    <h1
                      id="t-ok"
                      ref={tieuDeRef}
                      tabIndex={-1}
                      className="mt-3 text-[clamp(34px,6vw,52px)] leading-[1.1] outline-none"
                    >
                      <T k="transfer.title_success" />
                    </h1>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={t("transfer.received_aria")}
                  className="mt-6 flex flex-col gap-1.5 border border-l-4 border-ok-line border-l-ok bg-ok-bg px-6 py-5"
                >
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ok"><T k="transfer.we_received" /></span>
                  <span className="font-display text-[clamp(44px,9vw,64px)] font-semibold leading-none tracking-[-0.01em] text-[#1F4A2A] lining-nums tabular-nums">
                    <Tien so={tong} />
                  </span>
                  <span className="inline-flex items-center gap-2 text-[14px] text-ok-ink">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    <T k="transfer.matched" v={{ nd: noiDung }} />
                  </span>
                </div>
                <p className="mt-4 max-w-[520px] text-ink-muted">
                  <T k="transfer.packing" />
                </p>

                <dl className="m-0 mt-6 border border-line bg-cream">
                  <Fact nhan="transfer.fact_order">{noiDung}</Fact>
                  <Fact nhan="transfer.fact_paid"><Tien so={tong} /> · <T k="transfer.fact_method_bank" /></Fact>
                  <Fact nhan="transfer.fact_received_at">{lucNhan ? dinhDangThoiDiem(lucNhan.toISOString(), t("common.at")) : "—"}</Fact>
                  <Fact nhan="transfer.fact_deliver_to">
                    {don.hoTen}, {don.diaChi}
                  </Fact>
                  <Fact nhan="transfer.fact_eta"><T k="transfer.eta_value" /></Fact>
                </dl>

                <p className="mt-4 border-l-[3px] border-copper bg-warn-bg px-4 py-3.5 text-[14px] leading-relaxed text-warn">
                  <T k="transfer.age_check" />
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={`/theo-doi-don-hang?ma=${encodeURIComponent(noiDung)}`} className="btn-wine">
                    <T k="transfer.btn_track" />
                  </Link>
                  <Link href={LOI_VAO_CHINH[0].href} className="btn-wine-outline">
                    <T k="transfer.btn_continue" />
                  </Link>
                </div>
              </section>
            )}

            {/* ══════════ THẤT BẠI ══════════ */}
            {trangThai === "that-bai" && (
              <section aria-labelledby="t-loi">
                <div className="flex flex-col gap-4">
                  <div className="grid h-[76px] w-[76px] place-items-center rounded-full border border-bad-line bg-bad-bg text-bad" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 7v6.5M12 17.2v.1" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-caps text-bad">
                      {lyDo === "het-han" ? <T k="transfer.fail_expired_label" /> : <T k="transfer.fail_short_label" />}
                    </div>
                    <h1
                      id="t-loi"
                      ref={tieuDeRef}
                      tabIndex={-1}
                      className="mt-3 text-[clamp(34px,6vw,52px)] leading-[1.1] outline-none"
                    >
                      {lyDo === "het-han" ? <T k="transfer.fail_expired_title" /> : <T k="transfer.fail_short_title" />}
                    </h1>
                  </div>
                </div>

                <p className="mt-3 max-w-[520px] text-ink-muted">
                  {lyDo === "het-han" ? (
                    <T k="transfer.fail_expired_body" v={{ phut: HAN_CHUYEN_KHOAN_PHUT }} />
                  ) : (
                    <T k="transfer.fail_short_body" />
                  )}
                </p>

                <dl className="m-0 mt-6 border border-line bg-cream">
                  <Fact nhan="transfer.fact_order">{noiDung}</Fact>
                  {lyDo === "het-han" ? (
                    <>
                      <Fact nhan="transfer.fact_amount_needed"><Tien so={soTien} /></Fact>
                      <Fact nhan="transfer.fact_received">0đ</Fact>
                    </>
                  ) : (
                    <>
                      <Fact nhan="transfer.fact_order_value"><Tien so={tong} /></Fact>
                      <Fact nhan="transfer.fact_received"><Tien so={daNhan} /></Fact>
                      <Fact nhan="transfer.fact_remaining">
                        <span className="text-bad"><Tien so={conThieu} /></span>
                      </Fact>
                    </>
                  )}
                </dl>

                <p className="mt-5 border border-ok-line bg-ok-bg px-4 py-4 text-[14px] leading-relaxed text-ok-ink">
                  {lyDo === "het-han" ? (
                    <>
                      <b className="font-semibold"><T k="transfer.expired_paid_lead" /></b>{" "}
                      <T k="transfer.expired_paid_body" />
                    </>
                  ) : (
                    <>
                      <b className="font-semibold"><T k="transfer.short_safe_lead" /></b>{" "}
                      <T k="transfer.short_safe_pre" v={{ so: tienSong(conThieu) }} />{" "}
                      <b className="font-semibold">{noiDung}</b>{" "}
                      <T k="transfer.short_safe_post" />
                    </>
                  )}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {lyDo === "het-han" ? (
                    <button type="button" className="btn-wine" onClick={() => taoMaMoi()}>
                      <T k="transfer.btn_new_code" />
                    </button>
                  ) : (
                    <button type="button" className="btn-wine" onClick={() => taoMaMoi(conThieu)}>
                      <T k="transfer.btn_top_up" v={{ so: tienSong(conThieu) }} />
                    </button>
                  )}
                  {lyDo === "thieu" && zaloLink ? (
                    <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="btn-wine-outline">
                      <T k="transfer.btn_refund" />
                    </a>
                  ) : (
                    <Link href="/" className="btn-wine-outline">
                      <T k="transfer.btn_home" />
                    </Link>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* ══════════ TÓM TẮT ĐƠN ══════════ */}
          <aside aria-label={t("transfer.summary_aria")} className="lg:sticky lg:top-6">
            {/* ══════════ HỖ TRỢ: AI + NGƯỜI THẬT ══════════ */}
            <section
              aria-labelledby="sup-h"
              className={`mb-5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 border border-l-[3px] p-5 ${
                trangThai === "that-bai" ? "border-bad-line border-l-bad bg-bad-bg" : "border-line border-l-copper bg-cream"
              }`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-wine text-copper-light" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                  <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
                </svg>
              </div>
              <div>
                <h2 id="sup-h" className="text-[26px] leading-tight">
                  <T k="transfer.need_help" />
                </h2>
                <p className="mt-0.5 text-[14px] text-ink-muted">
                  {trangThai === "that-bai" ? (
                    <T k="transfer.help_failed" />
                  ) : (
                    <T k="transfer.help_waiting" v={{ nd: noiDung }} />
                  )}
                </p>
              </div>
              {/* Khối này nằm ở cột tóm tắt hẹp (≈400px): luôn xếp dọc, nút nằm dưới chữ — đúng như HoTro ở trang theo dõi đơn. */}
              <div className="col-span-full mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5">
                <button
                  type="button"
                  onClick={() => moChatAI(t("transfer.ask_ai_prompt", { ma: maHienThiDon(don.maDon), nd: noiDung }))}
                  aria-haspopup="dialog"
                  className="btn-wine"
                >
                  <T k="transfer.btn_ask_ai" />
                </button>
                {zaloLink && (
                  <a
                    href={zaloLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-[13px] font-semibold tracking-[0.06em] text-wine underline underline-offset-4"
                  >
                    <T k="transfer.zalo" />
                  </a>
                )}
              </div>
            </section>
            <div className="border border-line bg-cream p-5 sm:p-[22px]">
              <h2 className="mb-1 text-[28px] leading-tight"><T k="transfer.summary_title" /></h2>
              <div className="text-[13px] tracking-[0.06em] text-ink-soft"><T k="transfer.order_code" v={{ nd: noiDung }} /></div>
              <ul className="m-0 mt-[18px] list-none p-0">
                {don.monHang.map((m, i) => (
                  <li key={`${m.sku}-${i}`} className="flex items-center gap-3.5 border-t border-line py-3.5">
                    <span
                      aria-hidden="true"
                      className="grid h-[60px] w-11 shrink-0 place-items-center bg-[radial-gradient(120%_90%_at_50%_15%,#FBF6EA,#EADFCB)]"
                    >
                      <ChaiVang thuy={MAU_CHAI[i % MAU_CHAI.length]} cao="48px" />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-[19px] leading-tight">
                      <span className="dong-2">{m.title}</span>
                      <small className="mt-0.5 block font-sans text-[12px] leading-snug text-ink-soft">
                        <T k="transfer.qty" v={{ so: m.soLuong }} />
                      </small>
                    </span>
                    <span className="shrink-0 text-[14px] tabular-nums"><Tien so={m.thanhTien} /></span>
                  </li>
                ))}
              </ul>
              <dl className="m-0 grid gap-2 border-t border-line pt-3.5 text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt><T k="transfer.subtotal" /></dt>
                  <dd className="m-0 tabular-nums"><Tien so={tamTinh} /></dd>
                </div>
                {don.tienGiamMa > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt><T k="transfer.discount" /></dt>
                    <dd className="m-0 tabular-nums text-wine">−<Tien so={don.tienGiamMa} /></dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt><T k="transfer.shipping" /></dt>
                  <dd className={`m-0 tabular-nums ${don.phiGiaoHang === 0 ? "font-medium text-ok" : ""}`}>
                    {don.phiGiaoHang === 0 ? <T k="transfer.free" /> : <Tien so={don.phiGiaoHang} />}
                  </dd>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-line pt-3.5">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.14em]"><T k="transfer.total" /></dt>
                  <dd className="m-0 font-display text-[30px] font-medium leading-none lining-nums tabular-nums text-wine">
                    <Tien so={tong} />
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] leading-relaxed text-ink-soft">
                <T k="transfer.vat_note" />
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Dòng thông tin tài khoản, có nút sao chép tuỳ chọn. */
function Dong({
  nhan,
  children,
  chep,
  noiBat,
}: {
  /** Khoá i18n của nhãn. */
  nhan: string;
  children: ReactNode;
  chep?: { giaTri: string; khoaAria: string };
  noiBat?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-line py-3.5 last:border-b-0 ${
        noiBat ? "-mx-5 bg-[linear-gradient(90deg,rgba(176,141,87,.12),transparent)] px-5" : ""
      }`}
    >
      <dt className="text-[12px] uppercase tracking-[0.08em] text-ink-soft"><T k={nhan} /></dt>
      <dd
        className={`col-start-1 m-0 break-words font-medium ${
          noiBat ? "text-[20px] font-semibold tracking-[0.06em] text-wine" : "text-[16px]"
        }`}
      >
        {children}
      </dd>
      {chep && <NutChep giaTri={chep.giaTri} khoaAria={chep.khoaAria} />}
    </div>
  );
}

function NutChep({ giaTri, khoaAria }: { giaTri: string; khoaAria: string }) {
  const t = useT();
  const [ok, setOk] = useState(false);

  const xong = () => {
    setOk(true);
    setTimeout(() => setOk(false), 1600);
  };

  const chep = async () => {
    try {
      await navigator.clipboard.writeText(giaTri);
      xong();
    } catch {
      // Trình duyệt chặn Clipboard API (http, iframe…): chép bằng ô tạm.
      const o = document.createElement("textarea");
      o.value = giaTri;
      o.style.position = "fixed";
      o.style.opacity = "0";
      document.body.appendChild(o);
      o.select();
      try {
        if (document.execCommand("copy")) xong();
      } finally {
        document.body.removeChild(o);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={chep}
      aria-label={t(khoaAria)}
      className={`col-start-2 row-span-2 row-start-1 inline-flex min-h-11 min-w-[92px] items-center justify-center border px-3.5 text-[12px] font-semibold uppercase tracking-wide2 transition-colors ${
        ok ? "border-ok bg-ok text-white" : "border-ink text-ink hover:bg-ink hover:text-white"
      }`}
    >
      <span aria-live="polite">{ok ? <T k="transfer.copied" /> : <T k="transfer.copy" />}</span>
    </button>
  );
}

/** `nhan` là khoá i18n của nhãn. */
function Fact({ nhan, children }: { nhan: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line px-[18px] py-3.5 text-[14px] last:border-b-0">
      <dt className="text-ink-soft"><T k={nhan} /></dt>
      <dd className="m-0 text-right font-medium">{children}</dd>
    </div>
  );
}

function TheMau({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1.5 inline-block bg-menubar px-1.5 py-[3px] align-middle text-[10px] font-semibold leading-none tracking-[0.1em] text-copper-light">
      {children}
    </span>
  );
}

const N_QR = 29;

/** QR minh hoạ (KHÔNG quét được) — chỉ dùng ở môi trường chạy thử khi chưa khai `bank_bin`. */
function duLieuQrMau(): string[] {
  let s = 7;
  const g: number[][] = [];
  for (let i = 0; i < N_QR; i++) {
    g[i] = [];
    for (let j = 0; j < N_QR; j++) {
      s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
      g[i][j] = (s >> 16) & 1;
    }
  }
  const dinh = (x: number, y: number) => {
    for (let a = -1; a < 8; a++)
      for (let b = -1; b < 8; b++) {
        const X = x + a;
        const Y = y + b;
        if (X < 0 || Y < 0 || X >= N_QR || Y >= N_QR) continue;
        const trong = a >= 0 && a < 7 && b >= 0 && b < 7;
        g[Y][X] = trong && (a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4)) ? 1 : 0;
      }
  };
  dinh(0, 0);
  dinh(N_QR - 7, 0);
  dinh(0, N_QR - 7);
  const o: string[] = [];
  for (let i = 0; i < N_QR; i++) for (let j = 0; j < N_QR; j++) if (g[i][j]) o.push(`${j},${i}`);
  return o;
}

function QrMau() {
  const t = useT();
  const qrMauAria = t("transfer.qr_sample_aria");
  const o = useMemo(duLieuQrMau, []);
  return (
    <svg
      id="qr-mau"
      viewBox={`0 0 ${N_QR} ${N_QR}`}
      className="h-full w-full"
      role="img"
      aria-label={qrMauAria}
      shapeRendering="crispEdges"
    >
      <g fill="#1C1A19">
        {o.map((p) => {
          const [x, y] = p.split(",");
          return <rect key={p} x={x} y={y} width="1" height="1" />;
        })}
      </g>
    </svg>
  );
}

function LuuQrMau({ maDon }: { maDon: string }) {
  const luu = () => {
    const svg = document.getElementById("qr-mau");
    if (!svg) return;
    const x = new XMLSerializer()
      .serializeToString(svg)
      .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg" width="580" height="580" style="background:#fff"');
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([x], { type: "image/svg+xml" }));
    a.download = `${maDon}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <button
      type="button"
      onClick={luu}
      className="inline-flex min-h-11 items-center px-3 text-[13px] font-semibold tracking-[0.06em] text-wine underline underline-offset-4"
    >
      <T k="transfer.qr_save" />
    </button>
  );
}
