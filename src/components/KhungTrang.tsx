"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Logo from "./Logo";
import T from "./T";

/**
 * Khung trang: menu + chân trang đầy đủ ở mọi nơi, TRỪ trang đặt hàng.
 *
 * Ở bước chốt đơn mọi lối thoát đều là một cơ hội để khách bỏ đi, nên trang
 * `/thanh-toan` chỉ giữ tên thương hiệu và một đường quay lại giỏ. Dòng cảnh báo
 * tuổi ở chân trang vẫn giữ — đó là yêu cầu pháp lý với ngành rượu, không phải
 * trang trí.
 *
 * `dau` và `chan` là phần tử đã dựng sẵn (Header là client, Footer là server) và
 * được truyền xuống làm props, nên Footer vẫn render phía máy chủ.
 */
export default function KhungTrang({
  dau,
  chan,
  children,
}: {
  dau: ReactNode;
  chan: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const toiGian = pathname === "/thanh-toan" || pathname.startsWith("/thanh-toan/");

  if (!toiGian) {
    return (
      <>
        {dau}
        <main id="noi-dung" className="min-h-screen">
          {children}
        </main>
        {chan}
      </>
    );
  }

  return (
    <>
      <header className="border-b border-line bg-page">
        <div className="container-site grid h-[76px] grid-cols-[1fr_auto_1fr] items-center">
          <Link
            href="/gio-hang"
            className="lien-ket justify-self-start text-[11px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:text-wine"
          >
            <span aria-hidden="true">← </span>
            <T k="khungtrang.back_to_cart" />
          </Link>
          <Link href="/" aria-label="Trang chủ">
            <Logo />
          </Link>
          <span aria-hidden="true" />
        </div>
      </header>

      <main id="noi-dung" className="min-h-screen">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="container-site py-8 text-center text-[12px] leading-relaxed text-ink-soft">
          <p className="mx-auto max-w-2xl">
            <T k="common.alcoholic_products_not_for_anyone" />
          </p>
          <p className="mt-3">
            <Link href="/chinh-sach/chinh-sach-doi-tra" className="lien-ket">
              <T k="khungtrang.returns_policy" />
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
