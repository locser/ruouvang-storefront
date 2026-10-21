"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import OTimKiem from "./OTimKiem";
import DoiNgonNgu from "./DoiNgonNgu";
import T, { TL } from "./T";
import Logo from "./Logo";
import { useGioHang } from "@/lib/gio-hang-context";
import { LOI_VAO_CHINH, LOI_VAO_PHU, NHA_RUOU } from "@/lib/dieu-huong";
import { THANH_TREN_CUNG, duongDanDanhMuc } from "@/lib/theme";
import { khoaCuon } from "@/lib/khoa-cuon";
import { useT } from "@/i18n/use-t";

const LIEN_KET_NAV =
  "lien-ket relative py-2 text-[14px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors duration-300 hover:text-wine";

function Bieu({ d, className = "h-[22px] w-[22px]" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} stroke-current`}
      fill="none"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Header boutique — hai tầng, không còn dải chạy 45 danh mục.
 *
 *   1. Thanh thông báo mảnh (charcoal): khuyến mãi · hotline · VI|EN
 *   2. Thanh chính (giấy, dính đầu trang): nav trái · tên thương hiệu giữa ·
 *      tìm kiếm / tài khoản / giỏ phải. Mobile: menu · tên · tìm / giỏ.
 *
 * Tìm kiếm mở thành một dải riêng bên dưới thay vì chiếm chỗ cố định trên
 * thanh — header giữ được độ thoáng.
 */
export default function Header() {
  const { tongSoLuong: soLuong } = useGioHang();
  const [moNhaRuou, setMoNhaRuou] = useState(false);
  const [moMenu, setMoMenu] = useState(false);
  const [moTim, setMoTim] = useState(false);
  const nutDong = useRef<HTMLButtonElement>(null);
  const nutMo = useRef<HTMLButtonElement>(null);
  const ngan = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const t = useT();

  // Đi sang trang khác (kể cả nút Back của trình duyệt) thì đóng menu.
  useEffect(() => {
    setMoMenu(false);
    setMoTim(false);
  }, [pathname]);

  // Xoay ngang/kéo rộng tới cỡ desktop thì menu mobile không còn nghĩa — đóng lại,
  // nếu không body vẫn bị khoá cuộn mà không thấy lớp phủ nào.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const khiDoi = () => mq.matches && setMoMenu(false);
    mq.addEventListener("change", khiDoi);
    return () => mq.removeEventListener("change", khiDoi);
  }, []);

  // Menu mobile mở: khoá cuộn nền, Esc đóng, giữ Tab quanh quẩn trong ngăn kéo,
  // đưa focus vào nút đóng; đóng xong trả focus về nút ba gạch.
  useEffect(() => {
    if (!moMenu) return;
    const moKhoa = khoaCuon();
    nutDong.current?.focus({ preventScroll: true });

    const khiBamPhim = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoMenu(false);
        return;
      }
      if (e.key !== "Tab" || !ngan.current) return;
      const ds = ngan.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    const nutBatDau = nutMo.current;
    return () => {
      document.removeEventListener("keydown", khiBamPhim);
      moKhoa();
      nutBatDau?.focus({ preventScroll: true });
    };
  }, [moMenu]);

  useEffect(() => {
    if (!moNhaRuou) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoNhaRuou(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [moNhaRuou]);

  return (
    <>
      {/* ── 1. Thanh thông báo ──────────────────────────────────────────── */}
      <div className="nen-toi bg-ink text-page">
        <div className="container-site grid h-9 grid-cols-1 items-center text-[10.5px] tracking-[0.1em] sm:h-10 sm:grid-cols-[1fr_auto] sm:text-[11px] sm:tracking-[0.18em] lg:grid-cols-[1fr_auto_1fr]">
          <div className="hidden lg:block">
            {THANH_TREN_CUNG.dienThoai && (
              <a
                href={`tel:${THANH_TREN_CUNG.dienThoai.replace(/\s/g, "")}`}
                className="text-page/70 transition-colors hover:text-page"
              >
                {THANH_TREN_CUNG.dienThoai}
              </a>
            )}
          </div>
          <Link
            href={THANH_TREN_CUNG.khuyenMaiLink}
            className="col-start-1 truncate text-center uppercase text-copper-light transition-colors hover:text-page sm:text-left lg:col-start-2 lg:text-center"
          >
            <TL obj={THANH_TREN_CUNG} field="khuyenMai" />
          </Link>
          {/* Điện thoại: công tắc ngôn ngữ nằm trong menu (ngăn kéo) để dòng khuyến mãi được đủ chỗ. */}
          <div className="col-start-2 hidden justify-end sm:flex lg:col-start-3">
            <DoiNgonNgu />
          </div>
        </div>
      </div>

      {/* ── 2. Thanh chính (dính đầu trang) ─────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-line bg-page lg:bg-page/95 lg:backdrop-blur-sm">
        <div className="container-site grid h-[76px] grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[88px]">
          {/* Trái */}
          <div className="flex items-center">
            <button
              ref={nutMo}
              type="button"
              onClick={() => setMoMenu(true)}
              aria-label={t("header.open_menu")}
              aria-expanded={moMenu}
              aria-controls="menu-di-dong"
              className="-ml-2 grid h-11 w-11 touch-manipulation place-items-center text-ink active:opacity-60 lg:hidden"
            >
              <Bieu d="M3 7h18M3 12h18M3 17h12" />
            </button>

            <nav aria-label={t("header.main_nav")} className="hidden items-center gap-8 lg:flex">
              {LOI_VAO_CHINH.map((m) => (
                <Link key={m.href} href={m.href} className={LIEN_KET_NAV}>
                  <TL obj={m} field="ten" />
                </Link>
              ))}

              <div
                className="relative"
                onMouseEnter={() => setMoNhaRuou(true)}
                onMouseLeave={() => setMoNhaRuou(false)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setMoNhaRuou(false);
                  }
                }}
              >
                <button
                  type="button"
                  aria-expanded={moNhaRuou}
                  aria-haspopup="true"
                  onClick={() => setMoNhaRuou((v) => !v)}
                  className={`${LIEN_KET_NAV} flex items-center gap-1.5`}
                >
                  <T k="common.producers" />
                  <svg
                    viewBox="0 0 10 6"
                    className={`h-[5px] w-[9px] stroke-current transition-transform duration-300 ${
                      moNhaRuou ? "rotate-180" : ""
                    }`}
                    fill="none"
                    strokeWidth="1.2"
                    aria-hidden="true"
                  >
                    <path d="m1 1 4 4 4-4" />
                  </svg>
                </button>

                {moNhaRuou && NHA_RUOU.length > 0 && (
                  <div className="absolute left-0 top-full z-50 pt-4">
                    <div
                      className="vao-len w-[400px] border border-line bg-cream p-8 shadow-mega"
                      style={{ animationDuration: "0.35s" }}
                    >
                      <p className="nhan-nho mb-5">
                        <T k="header.selected_producers" />
                      </p>
                      <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
                        {NHA_RUOU.map((m) => (
                          <li key={m.href}>
                            <Link
                              href={m.href}
                              onClick={() => setMoNhaRuou(false)}
                              className="block py-1.5 font-display text-[19px] leading-tight text-ink transition-colors duration-200 hover:text-wine"
                            >
                              <TL obj={m} field="ten" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={duongDanDanhMuc("all")}
                        onClick={() => setMoNhaRuou(false)}
                        className="lien-ket mt-6 inline-block text-[11px] font-medium uppercase tracking-[0.16em] text-wine"
                      >
                        <T k="header.view_all_collections" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Giữa — thương hiệu */}
          <Link href="/" aria-label={t("common.home")} className="justify-self-center py-2">
            <Logo />
          </Link>

          {/* Phải */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <nav aria-label={t("header.explore")} className="mr-6 hidden items-center gap-8 lg:flex">
              {LOI_VAO_PHU.map((m) => (
                <Link key={m.href} href={m.href} className={LIEN_KET_NAV}>
                  <TL obj={m} field="ten" />
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setMoTim((v) => !v)}
              aria-label={t("header.search")}
              aria-expanded={moTim}
              className="grid h-11 w-11 place-items-center text-ink transition-colors duration-300 hover:text-wine"
            >
              <Bieu d="M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm9 2.5-4-4" />
            </button>

            <Link
              href="/tai-khoan"
              aria-label={t("header.account")}
              className="hidden h-11 w-11 place-items-center text-ink transition-colors duration-300 hover:text-wine sm:grid"
            >
              <Bieu d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.6-3.6 3.6-5.6 7.5-5.6s6.9 2 7.5 5.6" />
            </Link>

            <Link
              href="/gio-hang"
              aria-label={soLuong > 0 ? t("header.cart_with_count", { n: soLuong }) : t("header.cart")}
              className="relative grid h-11 w-11 place-items-center text-ink transition-colors duration-300 hover:text-wine"
            >
              <Bieu d="M5.5 8h13l-1 11.5h-11L5.5 8Zm3.5 0V7a3 3 0 0 1 6 0v1" />
              {soLuong > 0 && (
                <span className="absolute right-0.5 top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-wine px-1 text-[10px] font-medium tabular-nums leading-none text-page">
                  {soLuong > 99 ? "99+" : soLuong}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Dải tìm kiếm */}
        {moTim && (
          <div
            className="vao-len border-t border-line bg-page"
            style={{ animationDuration: "0.35s" }}
          >
            <div className="container-site py-4 lg:mx-auto lg:max-w-3xl">
              <OTimKiem tuFocus />
            </div>
          </div>
        )}
      </div>

      {/* ── Menu mobile: ngăn kéo trượt từ trái ─────────────────────────────
          Luôn có mặt trong DOM (chỉ ẩn bằng transform + `inert`) để mở/đóng chạy
          bằng CSS transition trên GPU thay vì dựng/huỷ cả cây phần tử mỗi lần bấm
          — đó là nguyên nhân cảm giác "bật cái" thiếu mượt của bản cũ. */}
      <div
        id="menu-di-dong"
        aria-hidden={!moMenu}
        inert={!moMenu}
        className={`fixed inset-0 z-[60] lg:hidden ${moMenu ? "" : "pointer-events-none"}`}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("header.close_menu")}
          onClick={() => setMoMenu(false)}
          className={`absolute inset-0 h-full w-full cursor-default bg-ink/50 transition-opacity duration-300 ease-cellar motion-reduce:transition-none ${
            moMenu ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={ngan}
          role="dialog"
          aria-modal="true"
          aria-label={t("header.menu")}
          className={`absolute inset-y-0 left-0 flex w-[88%] max-w-[400px] flex-col bg-page shadow-mega transition-transform duration-[420ms] ease-cellar will-change-transform motion-reduce:transition-none ${
            moMenu ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-line px-5">
            <Link href="/" onClick={() => setMoMenu(false)} aria-label={t("common.home")}>
              <Logo />
            </Link>
            <button
              ref={nutDong}
              type="button"
              onClick={() => setMoMenu(false)}
              aria-label={t("header.close_menu")}
              className="-mr-2 grid h-11 w-11 touch-manipulation place-items-center text-ink active:opacity-60"
            >
              <Bieu d="M6 6l12 12M18 6 6 18" />
            </button>
          </div>

          <nav
            aria-label={t("header.menu")}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
          >
            <ul>
              {[
                ...LOI_VAO_CHINH,
                { ten: "Tất cả danh mục", tenEn: "All collections", href: "/danh-muc" },
                ...LOI_VAO_PHU,
              ].map((m, i) => {
                const dangO = pathname === m.href;
                return (
                  <li
                    key={m.href}
                    className={`border-b border-line transition-[opacity,transform] duration-500 ease-cellar motion-reduce:transition-none ${
                      moMenu ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    style={{ transitionDelay: moMenu ? `${140 + i * 45}ms` : "0ms" }}
                  >
                    <Link
                      href={m.href}
                      onClick={() => setMoMenu(false)}
                      aria-current={dangO ? "page" : undefined}
                      className={`flex min-h-[56px] items-center justify-between py-3 font-display text-[28px] leading-tight active:opacity-60 ${
                        dangO ? "text-wine" : "text-ink"
                      }`}
                    >
                      <span>
                        <TL obj={m} field="ten" />
                      </span>
                      <Bieu d="m9 6 6 6-6 6" className="h-[18px] w-[18px] text-copper" />
                    </Link>
                  </li>
                );
              })}
              <li
                className={`border-b border-line transition-[opacity,transform] duration-500 ease-cellar motion-reduce:transition-none ${
                  moMenu ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: moMenu ? "400ms" : "0ms" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMoMenu(false);
                    setMoTim(true);
                  }}
                  className="flex min-h-[56px] w-full items-center justify-between py-3 text-left font-display text-[28px] leading-tight text-ink active:opacity-60"
                >
                  <span>
                    <T k="header.search" />
                  </span>
                  <Bieu d="M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm9 2.5-4-4" className="h-[18px] w-[18px] text-copper" />
                </button>
              </li>
              <li
                className={`transition-[opacity,transform] duration-500 ease-cellar motion-reduce:transition-none ${
                  moMenu ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
                style={{ transitionDelay: moMenu ? "445ms" : "0ms" }}
              >
                <Link
                  href="/tai-khoan"
                  onClick={() => setMoMenu(false)}
                  className="flex min-h-[56px] items-center justify-between py-3 font-display text-[28px] leading-tight text-ink active:opacity-60"
                >
                  <span>
                    <T k="header.account" />
                  </span>
                  <Bieu d="m9 6 6 6-6 6" className="h-[18px] w-[18px] text-copper" />
                </Link>
              </li>
            </ul>

            {NHA_RUOU.length > 0 && (
              <div
                className={`mt-8 transition-opacity duration-500 ease-cellar motion-reduce:transition-none ${
                  moMenu ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: moMenu ? "480ms" : "0ms" }}
              >
                <p className="nhan-nho mb-3">
                  <T k="common.producers" />
                </p>
                <ul className="flex flex-wrap gap-2">
                  {NHA_RUOU.map((m) => (
                    <li key={m.href}>
                      <Link
                        href={m.href}
                        onClick={() => setMoMenu(false)}
                        className="inline-flex min-h-[40px] items-center border border-ink/20 px-3.5 text-[13px] text-ink-muted transition-colors active:border-wine active:text-wine"
                      >
                        <TL obj={m} field="ten" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>

          <div className="flex shrink-0 items-center justify-between border-t border-line px-5 py-3.5">
            <span className="nhan-nho !m-0">
              <T k="header.language" />
            </span>
            <DoiNgonNgu nenToi={false} />
          </div>
        </div>
      </div>
    </>
  );
}
