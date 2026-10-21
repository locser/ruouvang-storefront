import type { MetadataRoute } from "next";
import { sanPhamBanDuoc, type SanPhamCoGia } from "./san-pham-ban-duoc";

interface MucCoHandle {
  handle: string;
}

interface BaiBlogSitemap {
  handle?: string;
  slug?: string;
  publishedAt?: string | null;
}

interface TrangTinhSitemap {
  slug: string;
}

interface DauVaoSitemap {
  goc: string;
  capNhat: Date;
  danhMuc: MucCoHandle[];
  sanPham: Array<MucCoHandle & SanPhamCoGia>;
  baiBlog: BaiBlogSitemap[];
  trangTinh: TrangTinhSitemap[];
}

/** Sinh sitemap từ dữ liệu đã tải; không gọi mạng nên kiểm thử được độc lập. */
export function taoSitemapCwWines({
  goc,
  capNhat,
  danhMuc,
  sanPham,
  baiBlog,
  trangTinh,
}: DauVaoSitemap): MetadataRoute.Sitemap {
  const site = goc.replace(/\/+$/, "");
  const ketQua: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: capNhat, changeFrequency: "daily", priority: 1 },
    {
      url: `${site}/su-kien`,
      lastModified: capNhat,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${site}/he-thong-cua-hang`,
      lastModified: capNhat,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${site}/blog`,
      lastModified: capNhat,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  ketQua.push(
    ...danhMuc
      .filter((muc) => muc.handle)
      .map((muc) => ({
        url: `${site}/danh-muc/${muc.handle}`,
        lastModified: capNhat,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ...sanPham
      .filter((muc) => muc.handle && sanPhamBanDuoc(muc))
      .map((muc) => ({
        url: `${site}/san-pham/${muc.handle}`,
        lastModified: capNhat,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...baiBlog
      .map((bai) => ({ ...bai, duongDan: bai.slug || bai.handle || "" }))
      .filter((bai) => bai.duongDan)
      .map((bai) => ({
        url: `${site}/blog/${bai.duongDan}`,
        lastModified: bai.publishedAt ? new Date(bai.publishedAt) : capNhat,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ...trangTinh
      .filter((trang) => trang.slug)
      .map((trang) => ({
        url: `${site}/chinh-sach/${trang.slug}`,
        lastModified: capNhat,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      }))
  );

  const daCo = new Set<string>();
  return ketQua.filter((muc) => {
    if (daCo.has(muc.url)) return false;
    daCo.add(muc.url);
    return true;
  });
}
