import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TheBaiViet from "@/components/TheBaiViet";
import T, { LHtml, TL } from "@/components/T";
import { layTruong, theoNgonNgu } from "@/i18n/translate";
import Anh from "@/components/Anh";
import { dinhDangNgay, layBai } from "@/lib/blog";
import { markdownSangHtml } from "@/lib/markdown";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bai = await layBai(slug);
  if (!bai) return { title: "Không tìm thấy bài viết | C.W. Wines" };
  return {
    title: bai.seoTitle || `${bai.tieuDe} | C.W. Wines`,
    description: bai.seoDescription || bai.tomTat,
    openGraph: {
      title: bai.seoTitle || bai.tieuDe,
      description: bai.seoDescription || bai.tomTat,
      images: bai.thumbnail ? [bai.thumbnail] : undefined,
      type: "article",
    },
  };
}

/**
 * Chi tiết bài viết.
 *
 * Nội dung là Markdown, dịch sang HTML bằng `markdownSangHtml` — bộ chuyển tay
 * có thoát HTML trước khi dựng thẻ (xem lib/markdown.ts).
 *
 * Cả hai bản ngôn ngữ đều được in ra và bọc trong `[data-vi]` / `[data-en]`;
 * CSS ẩn bên không dùng. `dangerouslySetInnerHTML` ở đây là bắt buộc vì đầu ra
 * là HTML đã dựng — an toàn nằm ở bước thoát trong bộ chuyển, không nằm ở đây.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bai = await layBai(slug);
  if (!bai) notFound();

  const html = theoNgonNgu((l) => markdownSangHtml(layTruong(bai, "noiDung", l)));

  return (
    <article className="container-site py-8">
      {/* Đường dẫn phân cấp */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden>/</span>
        <Link href="/blog" className="transition-colors hover:text-wine">
          Blog
        </Link>
        {bai.danhMuc[0] && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/blog/danh-muc/${bai.danhMuc[0].slug}`}
              className="transition-colors hover:text-wine"
            >
              {bai.danhMuc[0].name}
            </Link>
          </>
        )}
      </nav>

      <header className="mx-auto max-w-3xl text-center">
        {bai.danhMuc.length > 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {bai.danhMuc.map((c) => (
              <Link
                key={c.id}
                href={`/blog/danh-muc/${c.slug}`}
                className="bg-wine-pale px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-wine transition-colors hover:bg-wine hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <h1 className="font-display text-[26px] leading-tight text-ink md:text-[38px]">
          <TL obj={bai} field="tieuDe" />
        </h1>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] text-ink-soft">
          {bai.tacGia && <span>{bai.tacGia.name}</span>}
          {bai.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{dinhDangNgay(bai.publishedAt)}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>
            <T k="common.min_read" v={{ phutDoc: bai.phutDoc }} />
          </span>
        </div>
      </header>

      {bai.thumbnail && (
        <div className="relative mx-auto mt-8 aspect-[16/9] max-w-4xl overflow-hidden">
          <Anh
            src={bai.thumbnail}
            /* SỬA BUG-R33: ảnh đầu bài cần alt mô tả, không để rỗng. */
            alt={`Ảnh minh hoạ bài viết: ${bai.tieuDe}`}
            fill
            sizes="(max-width: 1023px) 100vw, 896px"
            priority
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      {bai.tomTat && (
        <p className="mx-auto mt-8 max-w-3xl border-l-4 border-wine pl-5 text-[16px] font-medium leading-relaxed text-ink">
          <TL obj={bai} field="tomTat" />
        </p>
      )}

      <div className="mx-auto mt-6 max-w-3xl">
        <LHtml values={html} />
      </div>

      {bai.the.length > 0 && (
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap gap-2 border-t border-line pt-6">
          {bai.the.map((t) => (
            <span
              key={t.id}
              className="border border-line px-3 py-1 text-[12px] text-ink-muted"
            >
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {bai.lienQuan && bai.lienQuan.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-center font-display text-[24px] text-ink md:text-[30px]">
            <T k="blog.related_articles" />
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bai.lienQuan.map((b) => (
              <TheBaiViet key={b.id} bai={b} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <Link href="/blog" className="btn-wine-outline">
          <T k="blog.all_articles" />
        </Link>
      </div>
    </article>
  );
}
