import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TheBaiViet from "@/components/TheBaiViet";
import T, { TL } from "@/components/T";
import { layDanhMucBlog, layDanhSachBai } from "@/lib/blog";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dm = (await layDanhMucBlog()).find((c) => c.slug === slug);
  return {
    title: dm ? `${dm.name} | Blog C.W. Wines` : "Chuyên mục | Blog C.W. Wines",
    description: dm
      ? `Các bài viết thuộc chuyên mục ${dm.name} trên blog C.W. Wines.`
      : undefined,
  };
}

/** Danh sách bài theo chuyên mục blog. */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const danhMuc = await layDanhMucBlog();

  const dm = danhMuc.find((c) => c.slug === slug);
  // Slug không có trong danh sách chuyên mục ⇒ 404 thật, không phải trang rỗng.
  // Trả trang rỗng cho mọi slug bịa ra sẽ sinh vô số URL "hợp lệ" cho Google.
  if (!dm) notFound();
  const { bai } = await layDanhSachBai({ danhMuc: slug, limit: 24 });

  return (
    <div className="container-site py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden>/</span>
        <Link href="/blog" className="transition-colors hover:text-wine">
          Blog
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">
          <TL obj={dm} field="name" />
        </span>
      </nav>

      <div className="mb-8 text-center">
        <h1 className="tieu-de-section gach-tieu-de">
          <TL obj={dm} field="name" />
        </h1>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/blog"
          className="border border-line bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-ink-muted transition-colors hover:border-wine hover:text-wine"
        >
          <T k="common.all" />
        </Link>
        {danhMuc.map((c) => (
          <Link
            key={c.id}
            href={`/blog/danh-muc/${c.slug}`}
            className={`border px-4 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors ${
              c.slug === slug
                ? "border-wine bg-wine text-white"
                : "border-line bg-white text-ink-muted hover:border-wine hover:text-wine"
            }`}
          >
            <TL obj={c} field="name" />
          </Link>
        ))}
      </div>

      {bai.length === 0 ? (
        <div className="border border-line bg-white py-20 text-center">
          <p className="text-[15px] text-ink-muted">
            <T k="blog.no_articles_in_this_category" />
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bai.map((b) => (
            <TheBaiViet key={b.id} bai={b} />
          ))}
        </div>
      )}
    </div>
  );
}
