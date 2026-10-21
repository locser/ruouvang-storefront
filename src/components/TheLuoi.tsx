import Link from "next/link";
import AnhChai from "./AnhChai";
import T from "./T";
import { layHuongVi } from "@/lib/huong-vi";

/**
 * Thẻ sản phẩm cho trang DANH SÁCH (danh mục, đang lọc, cuộn thêm).
 *
 * Cùng ngôn ngữ hình ảnh với `TheSanPham` (chai trên nền kem ấm, chữ canh giữa)
 * nhưng toàn thẻ là một liên kết và không có nút thêm giỏ — dữ liệu ở các danh
 * sách này là bản phẳng lấy từ Meilisearch, không đủ để thêm giỏ chính xác.
 */
export default function TheLuoi({
  handle,
  title,
  thumbnail,
  gia,
  giaGoc,
  hetHang,
  sapHet,
  soLuong,
  loai,
  tags,
}: {
  handle: string;
  title: string;
  thumbnail: string | null;
  gia: number;
  giaGoc?: number | null;
  hetHang?: boolean;
  sapHet?: boolean;
  soLuong?: number;
  loai?: string;
  tags?: string[];
}) {
  const dauVao = { title, handle, loai, tags, giaVnd: gia };
  const huongVi = layHuongVi(dauVao);
  const giam = giaGoc && giaGoc > gia ? Math.round((1 - gia / giaGoc) * 100) : 0;

  return (
    <Link href={`/san-pham/${handle}`} className="group flex flex-col text-center">
      <span className="the-sp__nen relative block aspect-[3/4] w-full overflow-hidden">
        {thumbnail && (
          <AnhChai
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            loading="lazy"
            className="object-contain p-4 mix-blend-multiply group-hover:-translate-y-1.5 sm:p-9"
          />
        )}
        {giam > 0 && (
          <span className="tag absolute left-3 top-3 bg-wine text-page">-{giam}%</span>
        )}
        {hetHang && (
          <span className="absolute inset-0 flex items-center justify-center bg-page/70 text-[11px] font-medium uppercase tracking-caps text-ink-muted">
            <T k="card.sold_out" />
          </span>
        )}
      </span>

      <span className="dong-2 mt-5 min-h-[2.5em] px-1 font-ten text-[16px] font-normal leading-[1.3] text-ink transition-colors duration-300 group-hover:text-wine sm:text-[19px]">
        {title}
      </span>

      {huongVi && (
        <span className="dong-2 mt-2 px-1 text-[12.5px] leading-snug text-ink-muted">
          <T k={huongVi} />
        </span>
      )}

      <span className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2.5">
        <span className={`gia-ban ${giam > 0 ? "!text-wine" : ""}`}>
          {gia.toLocaleString("vi-VN")}đ
        </span>
        {giam > 0 && giaGoc && (
          <span className="gia-goc">{giaGoc.toLocaleString("vi-VN")}đ</span>
        )}
      </span>

      {sapHet && !hetHang && (
        <span className="mt-1.5 text-[12px] font-medium text-wine">
          <T k="card.only_left" v={{ soLuong: soLuong ?? 0 }} />
        </span>
      )}
    </Link>
  );
}
