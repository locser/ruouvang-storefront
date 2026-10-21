import Link from "next/link";
import NutThemVaoGio from "./NutThemVaoGio";
import T from "./T";
import AnhChai from "./AnhChai";
import type { Product } from "@/lib/data";
import { duongDanSanPham } from "@/lib/theme";
import { layHuongVi } from "@/lib/huong-vi";
import { Tien } from "@/components/T";

/**
 * Thẻ sản phẩm boutique.
 *
 * Chai rượu đứng trên một tấm nền kem ấm (tỉ lệ 3:4) — không viền, không bóng
 * khi nghỉ. Chữ canh giữa bên dưới: nhà rượu (chữ nhỏ viết hoa) → tên (serif)
 * → xuất xứ · dung tích → giá → nút. Khi rê chuột chai nhích lên một chút và
 * nền sáng hơn; trên màn chạm nút thêm giỏ luôn hiện sẵn, không phụ thuộc hover.
 *
 * `mix-blend-multiply` làm nền trắng (nếu ảnh nguồn không trong suốt) hoà vào
 * nền kem thay vì để lộ một khung trắng quanh chai.
 *
 * Không có "use client" — dùng được trong Server Component; riêng nút thêm giỏ
 * là client component con.
 */
export default function TheSanPham({ product }: { product: Product }) {
  const giam = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const nhan = product.brand || product.origin || "";
  const dauVao = {
    title: product.title,
    handle: product.handle,
    loai: product.category,
    tags: product.tags,
    giaVnd: product.price,
  };
  const huongVi = layHuongVi(dauVao);

  return (
    <article className="the-sp group">
      <Link
        href={duongDanSanPham(product.handle)}
        className="the-sp__nen relative block aspect-[3/4] w-full overflow-hidden"
        aria-label={product.title}
      >
        {product.thumbnail ? (
          <AnhChai
            src={product.thumbnail}
            alt=""
            fill
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            loading="lazy"
            className="object-contain p-4 mix-blend-multiply group-hover:-translate-y-1.5 sm:p-9"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            <T k="common.image_coming_soon" />
          </div>
        )}

        {giam > 0 && (
          <span className="tag absolute left-3 top-3 bg-wine text-page">-{giam}%</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col items-center px-1 pt-5 text-center">
        {nhan && (
          <div className="mb-2 max-w-full truncate text-[11px] font-medium uppercase tracking-[0.16em] text-copper-ink">
            {nhan}
          </div>
        )}

        <h3 className="m-0 w-full">
          <Link
            href={duongDanSanPham(product.handle)}
            title={product.title}
            className="dong-2 min-h-[2.5em] font-ten text-[16px] font-normal leading-[1.3] text-ink transition-colors duration-300 hover:text-wine sm:text-[19px]"
          >
            {product.title}
          </Link>
        </h3>

        {(product.origin || product.volume) && (
          <div className="mt-2 truncate text-[12px] tracking-wide text-ink-soft">
            {[product.origin, product.volume].filter(Boolean).join(" · ")}
          </div>
        )}

        {huongVi && (
          <p className="dong-2 mt-2 text-[12.5px] leading-snug text-ink-muted">
            <T k={huongVi} />
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2.5">
          <span className={`gia-ban ${giam > 0 ? "!text-wine" : ""}`}>
            <Tien so={product.price} />
          </span>
          {giam > 0 && product.originalPrice && (
            <span className="gia-goc"><Tien so={product.originalPrice} /></span>
          )}
        </div>

        <div className="mt-auto w-full pt-5">
          <NutThemVaoGio
            product={product}
            className="btn-wine-outline w-full !min-h-[44px] !px-4 !py-2.5 !text-[11px]"
          />
        </div>
      </div>
    </article>
  );
}
