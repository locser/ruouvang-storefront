import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChiTietSanPham from "@/components/ChiTietSanPham";
import TheSanPham from "@/components/TheSanPham";
import T from "@/components/T";
import { fetchSanPhamTheoHandleAsync, laySanPhamGoiYAsync } from "@/lib/san-pham-server";
import { THUONG_HIEU } from "@/lib/theme";

interface Props {
  params: Promise<{ handle: string }>;
}

export const dynamicParams = true;

/**
 * Dựng lại trang sau mỗi 60 giây — khớp TTL của tầng dữ liệu trong
 * `medusa-catalog.ts`, đủ tươi cho giá bán mà vẫn cắt gần hết công lặp lại.
 *
 * KHÔNG có `generateStaticParams`: shop có 185 sản phẩm, dựng sẵn tất cả sẽ
 * kéo dài `next build` hàng chục phút để đổi lấy một lợi ích mà ISR đã cho
 * gần hết. Trang được dựng lần đầu khi có khách vào, rồi nằm trong đệm.
 */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchSanPhamTheoHandleAsync(handle);

  if (!product) {
    return {
      title: `Không tìm thấy sản phẩm — ${THUONG_HIEU.tenDayDu}`,
      description: "Sản phẩm quý khách tìm không còn tồn tại hoặc đã ngừng kinh doanh.",
    };
  }

  const gia = product.price.toLocaleString("vi-VN");
  const moTa = (product.description || "").slice(0, 155);

  // SỬA BUG-R34: bổ sung canonical — trước đây không trang nào có thẻ này.
  return {
    title: product.title,
    description: moTa || `${product.title} — giá ${gia}đ tại C.W. Wines.`,
    alternates: { canonical: `/san-pham/${handle}` },
    openGraph: {
      title: `${product.title} — ${THUONG_HIEU.ten}`,
      description: moTa,
      images: product.thumbnail
        ? [{ url: product.thumbnail, alt: product.title }]
        : undefined,
      type: "website",
    },
  };
}

/**
 * Dữ liệu có cấu trúc Product — SỬA BUG-R34.
 *
 * Báo cáo kiểm thử ghi "JSON-LD (0 khối)". Thiếu khối này thì Google không hiện
 * giá và tình trạng còn hàng ngay trong kết quả tra cứu, và chia sẻ đường dẫn
 * chai rượu lên Facebook/Zalo cũng không ra thẻ sản phẩm.
 *
 * ⚠️ Chỉ khai những trường CÓ dữ liệu thật. Không bịa `aggregateRating` khi
 * website chưa có đánh giá khách hàng nào (BUG-R17) — khai rating giả là vi
 * phạm chính sách dữ liệu có cấu trúc của Google và có thể bị phạt xếp hạng.
 */
function duLieuSanPham(product: {
  title: string;
  handle: string;
  sku: string;
  description: string;
  thumbnail: string;
  price: number;
  brand?: string;
  origin?: string;
  volume?: string;
}) {
  const goc =
    process.env.CONFIG_SITE_URL || "http://localhost:8900";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.sku || undefined,
    description: (product.description || "").slice(0, 500) || undefined,
    image: product.thumbnail || undefined,
    url: `${goc}/san-pham/${product.handle}`,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    countryOfOrigin: product.origin || undefined,
    offers: {
      "@type": "Offer",
      url: `${goc}/san-pham/${product.handle}`,
      priceCurrency: "VND",
      price: product.price,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: THUONG_HIEU.tenDayDu },
    },
  };
}

export default async function TrangChiTietSanPham({ params }: Props) {
  const { handle } = await params;

  // Chạy SONG SONG thay vì nối đuôi: khối gợi ý cũng cần chính sản phẩm này,
  // nhưng nhờ `cache()` của React hai nhánh dùng CHUNG một lời gọi Medusa.
  const [product, goiY] = await Promise.all([
    fetchSanPhamTheoHandleAsync(handle),
    laySanPhamGoiYAsync(handle, 5),
  ]);

  if (!product) notFound();

  return (
    <div className="container-site py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(duLieuSanPham(product)),
        }}
      />

      <nav
        aria-label="Đường dẫn"
        className="mb-8 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-soft md:mb-10"
      >
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <Link href="/danh-muc/all" className="transition-colors hover:text-wine">
          <T k="product_page.wine" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <span aria-current="page" className="dong-2 max-w-[60ch] normal-case tracking-normal text-ink">{product.title}</span>
      </nav>

      <ChiTietSanPham product={product} ghepCung={goiY.slice(0, 2)} />

      {goiY.length > 0 && (
        <section className="mt-24 border-t border-line pt-16 md:mt-32 md:pt-20">
          <div className="mb-12 text-center">
            <p className="nhan-nho mb-4">
              <T k="common.suggested" />
            </p>
            <h2 className="tieu-de-section gach-tieu-de">
              <T k="product_page.you_may_also_like" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
            {goiY.slice(0, 4).map((p) => (
              <TheSanPham key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
