import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import T, { LHtml, TL } from "@/components/T";
import { layTruong, theoNgonNgu } from "@/i18n/translate";
import { markdownSangHtml } from "@/lib/markdown";
import { TRANG_TINH, layTrangTinh, slugChinhThuc } from "@/lib/trang-tinh-cwwines";
import { HE_THONG_CUA_HANG } from "@/lib/theme";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Mười trang tĩnh — dựng sẵn hết lúc build, không có gì để chờ. */
export function generateStaticParams() {
  return TRANG_TINH.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trang = layTrangTinh(slug);
  if (!trang) return { title: "Không tìm thấy trang | C.W. Wines" };
  return {
    title: `${trang.tieuDe} | C.W. Wines`,
    description: trang.moTa,
  };
}

/**
 * Một trang tĩnh (giới thiệu, chính sách, liên hệ…).
 *
 * Nội dung song ngữ lấy từ dữ liệu cào trong `lib/trang-tinh-cwwines.ts`; cả hai bản được
 * in ra và CSS ẩn bên không dùng — xem components/Song.tsx.
 */
export default async function Page({ params }: Props) {
  const { slug } = await params;

  // SỬA BUG-R03: slug rút gọn từng nằm trong chân trang và trang đăng nhập
  // (`bao-mat`, `doi-tra`, `dieu-khoan`) được đưa về đúng trang nội dung thay vì
  // trả 404. Dùng chuyển hướng vĩnh viễn để bộ máy tìm kiếm cập nhật địa chỉ.
  const chuan = slugChinhThuc(slug);
  if (chuan) permanentRedirect(`/chinh-sach/${chuan}`);

  const trang = layTrangTinh(slug);
  if (!trang) notFound();

  const html = theoNgonNgu((l) => markdownSangHtml(layTruong(trang, "noiDung", l)));

  return (
    <div className="container-site py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">
          <TL obj={trang} field="tieuDe" />
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <article>
          <h1 className="font-display text-[26px] leading-tight text-ink md:text-[34px]">
            <TL obj={trang} field="tieuDe" />
          </h1>
          <div className="mt-2 h-[3px] w-16 bg-wine" />

          <div className="mt-6 max-w-3xl">
            <LHtml values={html} />
          </div>
        </article>

        {/* Cột phụ — mục lục các trang khác + hỗ trợ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="panel p-5">
            <h2 className="section-title mb-3">
              <T k="policy.more_information" />
            </h2>
            <ul className="space-y-2">
              {TRANG_TINH.filter((t) => t.slug !== slug).map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/chinh-sach/${t.slug}`}
                    className="block text-[13px] leading-snug text-ink-muted transition-colors hover:text-wine"
                  >
                    <TL obj={t} field="tieuDe" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel mt-4 p-5">
            <h2 className="section-title mb-3">
              <T k="policy.need_help" />
            </h2>
            <a
              href={`tel:${HE_THONG_CUA_HANG.hotline.replace(/\s/g, "")}`}
              className="block text-[20px] font-bold text-wine"
            >
              {HE_THONG_CUA_HANG.hotline}
            </a>
            <a
              href={`mailto:${HE_THONG_CUA_HANG.email}`}
              className="mt-1 block text-[13px] text-ink-muted transition-colors hover:text-wine"
            >
              {HE_THONG_CUA_HANG.email}
            </a>
            <Link href="/he-thong-cua-hang" className="btn-wine-outline mt-4 w-full !px-4 !text-[12px]">
              <T k="common.find_a_store" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
