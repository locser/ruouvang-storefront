import Link from "next/link";
import T, { TL } from "./T";
import Anh from "./Anh";
import { dinhDangNgay, type BaiViet } from "@/lib/blog";

/** Thẻ bài viết dùng cho lưới blog và khối "bài liên quan". */
export default function TheBaiViet({ bai }: { bai: BaiViet }) {
  return (
    <article className="group flex h-full flex-col border border-line bg-white transition-shadow hover:shadow-card-hover">
      <Link
        href={`/blog/${bai.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-page"
      >
        {bai.thumbnail ? (
          <Anh
            src={bai.thumbnail}
            /* SỬA BUG-R33: ảnh minh hoạ bài viết cần alt mô tả nội dung. */
            alt={`Ảnh minh hoạ bài viết: ${bai.tieuDe}`}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-display text-[22px] text-ink-soft">
            C.W. Wines
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {bai.danhMuc.length > 0 && (
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-wine">
            {bai.danhMuc[0].name}
          </div>
        )}

        <h3 className="dong-3 text-[16px] font-bold leading-snug text-ink transition-colors group-hover:text-wine">
          <Link href={`/blog/${bai.slug}`}>
            <TL obj={bai} field="tieuDe" />
          </Link>
        </h3>

        {bai.tomTat && (
          <p className="dong-3 mt-2 text-[13px] leading-relaxed text-ink-muted">
            <TL obj={bai} field="tomTat" />
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-ink-soft">
          {bai.publishedAt && <span>{dinhDangNgay(bai.publishedAt)}</span>}
          <span aria-hidden>·</span>
          <span>
            <T k="common.min_read" v={{ phutDoc: bai.phutDoc }} />
          </span>
        </div>
      </div>
    </article>
  );
}
