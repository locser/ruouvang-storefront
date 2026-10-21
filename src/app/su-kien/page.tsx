import type { Metadata } from "next";
import Link from "next/link";
import T from "@/components/T";
import DanhSachSuKien from "@/components/DanhSachSuKien";
import { SU_KIEN } from "@/lib/su-kien";

/**
 * Trang Sự kiện & ưu đãi: nơi gom các đợt giảm giá, chương trình tặng quà khi mua và
 * combo (thùng 6 chai, gói câu lạc bộ). Dữ liệu hiện là DEMO — xem `lib/su-kien.ts`.
 */

export const metadata: Metadata = {
  title: "Sự kiện & ưu đãi",
  description:
    "Các đợt giảm giá, chương trình tặng quà khi mua rượu vang và combo thùng 6 chai tại C.W. Wines.",
  alternates: { canonical: "/su-kien" },
};

export default function TrangSuKien() {
  return (
    <div className="container-site py-8 md:py-14">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 hidden flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-soft sm:flex"
      >
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <span aria-current="page" className="text-ink">
          <T k="events.eyebrow" />
        </span>
      </nav>

      <header className="mb-10 text-center md:mb-12">
        <p className="nhan-nho mb-3 md:mb-4">
          <T k="events.eyebrow" />
        </p>
        <h1 className="tieu-de-section gach-tieu-de">
          <T k="events.title" />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          <T k="events.intro" />
        </p>
      </header>

      <DanhSachSuKien suKien={SU_KIEN} />
    </div>
  );
}
