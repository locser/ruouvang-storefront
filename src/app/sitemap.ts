import type { MetadataRoute } from "next";
import { layCayDanhMuc } from "@/lib/medusa-catalog";
import { layDanhSachBai } from "@/lib/blog";
import { laySanPhamTheoDanhMuc } from "@/lib/meili";
import { taoSitemapCwWines } from "@/lib/sitemap-cwwines";
import { TRANG_TINH } from "@/lib/trang-tinh-cwwines";

/**
 * sitemap.xml — SỬA BUG-R34 (kiểm thử 05/08/2026: `/sitemap.xml` trả về 404).
 *
 * Gồm trang gốc, cửa hàng, blog, các trang tĩnh, đủ danh mục, sản phẩm bán được
 * và bài blog. Catalog lấy từ Meilisearch để không kéo Store API nặng của
 * Medusa; các tầng đọc đều tự trả rỗng khi dịch vụ phụ trợ tạm thời lỗi.
 */
// Không dựng tĩnh khi build: lúc đó secret Meilisearch/Medusa thường chưa được
// truyền vào image, khiến sitemap bị đóng băng với phần catalog rỗng.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const GOC = process.env.CONFIG_SITE_URL || "http://localhost:8900";
  const capNhat = new Date();
  const [cay, ketQuaSanPham, ketQuaBlog] = await Promise.all([
    layCayDanhMuc(),
    laySanPhamTheoDanhMuc(undefined, 1_000),
    layDanhSachBai({ limit: 1_000 }),
  ]);
  const danhMuc: { handle: string }[] = [];
  const duyet = (ds: typeof cay) => {
    for (const muc of ds) {
      danhMuc.push({ handle: muc.handle });
      if (muc.con?.length) duyet(muc.con);
    }
  };
  duyet(cay);

  return taoSitemapCwWines({
    goc: GOC,
    capNhat,
    danhMuc,
    sanPham: ketQuaSanPham.sanPham,
    baiBlog: ketQuaBlog.bai,
    trangTinh: TRANG_TINH,
  });
}
