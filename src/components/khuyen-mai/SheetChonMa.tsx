"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import T from "../T";
import { useT } from "@/i18n/use-t";
import { useGioHang } from "@/lib/gio-hang-context";
import { khoaCuon } from "@/lib/khoa-cuon";
import { maLoiNhat, type KetQuaMa } from "@/lib/khuyen-mai";
import {
  dieuKienMa,
  giaTriMa,
  loiNhapMa,
  lyDoTrongDanhSach,
  type ThongDiep,
} from "@/lib/khuyen-mai-text";

/**
 * BẢNG CHỌN MÃ GIẢM GIÁ (theo bản thiết kế "Chọn mã giảm giá").
 *
 *   Mobile : bottom sheet trượt từ đáy, cao tối đa 90% màn hình, có thanh kéo, vùng cuộn riêng và
 *            chân bảng dính (nút "Dùng mã …") nên ngón cái luôn với tới.
 *   ≥ md   : ngăn kéo bên phải rộng 440px, cao cả màn hình, để khách vẫn thấy "Tổng đơn hàng".
 *
 * Được portal lên `document.body` để lớp phủ luôn đè lên header dính (header nằm trong một
 * khối có stacking context riêng nên không thể đè bằng z-index tại chỗ).
 *
 * Nội dung: ô NHẬP MÃ + Áp dụng (lỗi hiện ngay dưới ô, nói rõ còn thiếu bao nhiêu) → "Mã anh/chị có
 * thể dùng" (radio, mã có lợi nhất được gắn nhãn) → "Chưa dùng được" (kèm lý do cụ thể).
 *
 * Trợ năng: role="dialog" + aria-modal, khoá cuộn nền (lib/khoa-cuon), Esc đóng, Tab quanh quẩn
 * trong bảng, focus vào nút đóng khi mở và TRẢ VỀ nút đã mở khi đóng; hộp radio là radio thật.
 */

function Dong({ m, className }: { m: ThongDiep; className?: string }) {
  return <T k={m.k} v={m.v} className={className} />;
}

export default function SheetChonMa({ mo, dong }: { mo: boolean; dong: () => void }) {
  const t = useT();
  const idTieuDe = useId();
  const idLoi = useId();
  const { uuDai, maGiamGia, apDungMa, boMa } = useGioHang();

  const [hien, setHien] = useState(false);
  const [vao, setVao] = useState(false);
  const [nhap, setNhap] = useState("");
  const [loi, setLoi] = useState<ThongDiep | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [xemKhong, setXemKhong] = useState(false);

  const bang = useRef<HTMLDivElement>(null);
  const nutDong = useRef<HTMLButtonElement>(null);
  const nutDaMo = useRef<HTMLElement | null>(null);

  // Danh sách gợi ý lấy từ Medusa; hiện chỉ giữ mã đang áp dụng, vì danh mục mẫu cũ không còn đúng với backend.
  const ketQua = useMemo<KetQuaMa[]>(() => (uuDai.ma ? [uuDai.ma] : []), [uuDai]);

  const dung = useMemo(() => ketQua.filter((d) => d.hopLe), [ketQua]);
  const khong = useMemo(() => ketQua.filter((d) => !d.hopLe), [ketQua]);
  const tot = useMemo(() => maLoiNhat(dung), [dung]);
  const dungSapXep = useMemo(
    () => [...dung].sort((a, b) => (b.ma.ma === tot ? 1 : 0) - (a.ma.ma === tot ? 1 : 0) || b.giam - a.giam),
    [dung, tot]
  );

  // Mount/unmount có hiệu ứng: dựng DOM trước, lần vẽ sau mới bật lớp "vào" để transition chạy.
  useEffect(() => {
    if (mo) {
      setHien(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVao(true)));
      return () => cancelAnimationFrame(r);
    }
    setVao(false);
    const h = window.setTimeout(() => setHien(false), 320);
    return () => window.clearTimeout(h);
  }, [mo]);

  // Mỗi lần mở: đặt lại ô nhập, chọn sẵn mã đang dùng (hoặc mã có lợi nhất).
  useEffect(() => {
    if (!mo) return;
    setNhap("");
    setLoi(null);
    setChon(maGiamGia && dung.some((d) => d.ma.ma === maGiamGia) ? maGiamGia : tot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mo]);

  // Khoá cuộn nền, Esc, giữ Tab trong bảng, quản lý focus.
  useEffect(() => {
    if (!mo) return;
    nutDaMo.current = document.activeElement as HTMLElement | null;
    const moKhoa = khoaCuon();
    const h = window.setTimeout(() => nutDong.current?.focus({ preventScroll: true }), 60);

    const khiBamPhim = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dong();
        return;
      }
      if (e.key !== "Tab" || !bang.current) return;
      const ds = bang.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (ds.length === 0) return;
      const dau = ds[0];
      const cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) {
        e.preventDefault();
        cuoi.focus();
      } else if (!e.shiftKey && document.activeElement === cuoi) {
        e.preventDefault();
        dau.focus();
      }
    };
    document.addEventListener("keydown", khiBamPhim);
    return () => {
      window.clearTimeout(h);
      document.removeEventListener("keydown", khiBamPhim);
      moKhoa();
      nutDaMo.current?.focus({ preventScroll: true });
    };
  }, [mo, dong]);

  if (!hien) return null;

  const apNhap = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const r = await apDungMa(nhap);
    if (r.ok) dong();
    else setLoi(r.loi ?? { k: "promo.err_unknown" });
  };

  const dungMaDaChon = async () => {
    if (!chon) return;
    const r = await apDungMa(chon);
    if (r.ok) dong();
    else setLoi(r.loi ?? null);
  };

  // Portal lên body: `hien` chỉ bật sau effect nên lúc này đã ở phía client, có `document`.
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("promo.sheet_close")}
        onClick={dong}
        className={`absolute inset-0 h-full w-full cursor-default bg-ink/55 transition-opacity duration-300 ease-cellar motion-reduce:transition-none ${
          vao ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={bang}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTieuDe}
        className={`absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col bg-page shadow-mega transition-[transform,opacity] duration-300 ease-cellar will-change-transform motion-reduce:transition-none md:inset-y-0 md:bottom-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] ${
          vao
            ? "translate-y-0 opacity-100 md:translate-x-0"
            : "translate-y-full opacity-100 md:translate-x-full md:translate-y-0"
        }`}
      >
        {/* thanh kéo (trang trí) */}
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[#CFC4B3]" />
        </div>

        <div className="flex items-center justify-between py-1 pl-5 pr-3 md:pt-4">
          <h2 id={idTieuDe} className="m-0 font-display text-[28px] font-normal leading-tight text-ink">
            <T k="promo.sheet_title" />
          </h2>
          <button
            ref={nutDong}
            type="button"
            onClick={dong}
            aria-label={t("promo.sheet_close")}
            className="grid h-11 w-11 place-items-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wine active:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* data-lenis-prevent: Lenis đang dừng (body khoa-cuon) sẽ chặn cả cuộn bên trong bảng này. */}
        <div
          data-lenis-prevent=""
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-4 pt-1 [scrollbar-width:thin]"
        >
          {/* Nhập mã */}
          <form onSubmit={apNhap} className="flex flex-col gap-2" noValidate>
            <label htmlFor={`${idTieuDe}-ma`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A433D]">
              <T k="promo.enter_code" />
            </label>
            <div className="flex gap-2">
              <input
                id={`${idTieuDe}-ma`}
                value={nhap}
                onChange={(e) => {
                  setNhap(e.target.value);
                  if (loi) setLoi(null);
                }}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={loi ? true : undefined}
                aria-describedby={loi ? idLoi : undefined}
                className={`h-12 min-w-0 flex-1 border bg-cream px-3.5 text-[15px] uppercase tracking-[0.06em] text-ink outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft focus-visible:border-wine ${
                  loi ? "border-[#8C2F3F]" : "border-line"
                }`}
              />
              <button
                type="submit"
                className="h-12 shrink-0 border border-ink px-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-ink hover:text-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine active:bg-ink active:text-page motion-reduce:transition-none"
              >
                <T k="promo.apply" />
              </button>
            </div>
            {loi && (
              <p id={idLoi} role="alert" className="m-0 text-[13px] leading-relaxed text-[#8C2F3F]">
                <Dong m={loi} />
              </p>
            )}
          </form>

          {/* Mã dùng được */}
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 p-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A433D]">
              <T k="promo.usable" />
            </legend>

            {dungSapXep.length === 0 && (
              <p className="m-0 text-[13px] text-ink-muted">
                <T k="promo.none_usable" />
              </p>
            )}

            {dungSapXep.map((d) => {
              const dangChon = chon === d.ma.ma;
              const gia = giaTriMa(d);
              return (
                <label
                  key={d.ma.ma}
                  className={`flex cursor-pointer items-start gap-3 bg-cream p-3.5 transition-colors motion-reduce:transition-none ${
                    dangChon ? "border-[1.5px] border-wine" : "border border-line hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="ma-giam-gia"
                    checked={dangChon}
                    onChange={() => {
                      setChon(d.ma.ma);
                      setLoi(null);
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-wine"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-semibold tracking-[0.06em] text-ink">{d.ma.ma}</span>
                      {d.ma.ma === tot && (
                        <span className="bg-[#EDF3EC] px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-[#2F5535]">
                          <T k="promo.best" />
                        </span>
                      )}
                    </span>
                    <span className="text-[14px] font-semibold text-[#3F6B45]">
                      <Dong m={gia} />
                    </span>
                    <span className="text-[12px] leading-relaxed text-ink-muted">
                      {dieuKienMa(d).map((c, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          <Dong m={c} />
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {/* Chưa dùng được */}
          {khong.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-label={t("promo.unusable")}>
              <button
                type="button"
                onClick={() => setXemKhong((v) => !v)}
                aria-expanded={xemKhong}
                className="flex min-h-[44px] items-center justify-between text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A433D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              >
                <span>
                  <T k="promo.unusable" /> ({khong.length})
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${xemKhong ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {xemKhong && khong.map((d) => (
                <div key={d.ma.ma} className="flex flex-col gap-1 border border-line p-3.5">
                  <span className="text-[15px] font-semibold tracking-[0.06em] text-ink-muted">{d.ma.ma}</span>
                  <span className="text-[13px] text-ink-muted">
                    <Dong m={giaTriMa(d)} />
                    {d.ma.donToiThieu ? (
                      <>
                        {" · "}
                        <T k="promo.cond_min_order" v={{ so: `${d.ma.donToiThieu.toLocaleString("vi-VN")}đ` }} />
                      </>
                    ) : null}
                  </span>
                  <span className="text-[12px] font-semibold text-wine">
                    <Dong m={lyDoTrongDanhSach(d)} />
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Chân bảng dính */}
        <div
          className="flex flex-col gap-2.5 border-t border-line bg-cream px-5 pt-3.5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <p className="m-0 text-center text-[12px] leading-relaxed text-ink-muted">
            <T k="promo.sheet_note" />
          </p>
          <button
            type="button"
            onClick={dungMaDaChon}
            disabled={!chon}
            className="btn-wine !min-h-[50px] w-full"
          >
            {chon ? <T k="promo.use_code" v={{ ma: chon }} /> : <T k="promo.use_none" />}
          </button>
          {maGiamGia && (
            <button
              type="button"
              onClick={() => {
                boMa();
                dong();
              }}
              className="min-h-[44px] text-[12px] font-medium uppercase tracking-[0.12em] text-ink-muted underline underline-offset-4 transition-colors hover:text-wine"
            >
              <T k="promo.code_remove" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
