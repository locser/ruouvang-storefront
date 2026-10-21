import pages from "./cwwines-pages.json";

export interface TrangTinh {
  slug: string;
  tieuDe: string;
  tieuDeEn: string;
  moTa: string;
  moTaEn: string;
  noiDung: string;
  noiDungEn: string;
}

/** 68 trang thật từ sitemap Shopify; không ghim cứng đường dẫn about-us 404. */
export const TRANG_TINH: TrangTinh[] = pages.map((p) => ({
  slug: p.handle,
  // Nguồn chỉ có tiếng Anh. Không gắn nhãn "đã dịch" khi chưa có bản dịch;
  // giao diện Việt vẫn hiện nguyên nội dung nguồn thay vì bịa nội dung pháp lý.
  tieuDe: p.title,
  tieuDeEn: p.title,
  moTa: p.description || p.content.slice(0, 180),
  moTaEn: p.description || p.content.slice(0, 180),
  noiDung: p.content,
  noiDungEn: p.content,
}));

export const SLUG_RUT_GON: Record<string, string> = {
  "bao-mat": "privacy-policy",
  "chinh-sach-bao-mat": "privacy-policy",
  "dieu-khoan": "terms-conditions",
  "dieu-khoan-va-dieu-kien": "terms-conditions",
  "lien-he": "contact",
  "gioi-thieu": "about-cw",
  "ve-chung-toi": "about-cw",
};

export function slugChinhThuc(slug: string): string | undefined {
  return SLUG_RUT_GON[slug];
}

export function layTrangTinh(slug: string): TrangTinh | undefined {
  return TRANG_TINH.find((t) => t.slug === slug);
}
