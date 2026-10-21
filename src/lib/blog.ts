/**
 * Tầng đọc BLOG từ Store API của Medusa — CHỈ CHẠY PHÍA SERVER.
 *
 * Engine blog nằm ở `apps/backend/src/modules/blog`: model đa ngôn ngữ (mỗi
 * trường chữ là một map `{ "vi-VN": …, "en-US": … }`), giao diện soạn bài trong
 * Medusa Admin, và ba route công khai `/store/blog/*`. Bảng đã có sẵn trong
 * CSDL `medusa_cwwines` từ lượt `db:migrate` đầu tiên.
 *
 * ⚠️ MỖI BÀI ĐƯỢC LẤY MỘT LẦN CHO MỖI NGÔN NGỮ trong `LOCALES` (`?locale=…`).
 *
 * Store API trả về bài ĐÃ phẳng hoá theo đúng một locale (service tự chọn chuỗi
 * rồi vứt các bản dịch còn lại). Nhưng site đổi ngôn ngữ ở phía trình duyệt bằng
 * CSS (xem components/T.tsx) — máy chủ không biết khách đang xem tiếng gì. Nên
 * phải lấy đủ mọi bản rồi in tất cả vào HTML. Kết quả được ghép theo quy ước
 * hậu tố: `tieuDe` (ngôn ngữ gốc), `tieuDeEn`, `tieuDeKo`…
 *
 * Giá phải trả là số lượt gọi nhân với số ngôn ngữ; chúng chạy song song và được
 * Data Cache của Next.js giữ 5 phút, nên thực tế là một lượt mỗi 5 phút cho mỗi trang.
 */

import "server-only";
import { cache as dedupeTrongMotLuotRender } from "react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, type Locale } from "@/i18n/config";

const GOC = process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000";
const KHOA = process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA || "";

/** Bài viết đổi ít hơn sản phẩm nhiều — giữ đệm 5 phút. */
const TTL = 300;

export interface DanhMucBlog {
  id: string;
  slug: string;
  name: string;
  /** Bản dịch theo hậu tố ngôn ngữ: `nameEn`, `nameKo`… */
  [truong: string]: unknown;
}

const hauTo = (l: Locale) => l.charAt(0).toUpperCase() + l.slice(1);

/** Một bài viết, đã ghép sẵn mọi ngôn ngữ (trường gốc + hậu tố `En`/`Ko`…). */
export interface BaiViet {
  [truong: string]: unknown;
  id: string;
  slug: string;
  thumbnail: string | null;
  publishedAt: string | null;
  noiBat: boolean;
  phutDoc: number;
  tieuDe: string;
  tomTat: string;
  /** Markdown — chỉ có ở trang chi tiết. */
  noiDung?: string;
  seoTitle?: string;
  seoDescription?: string;
  tacGia: { name: string; avatar: string | null } | null;
  danhMuc: DanhMucBlog[];
  the: DanhMucBlog[];
  lienQuan?: BaiViet[];
}

async function goi<T = any>(duongDan: string): Promise<T | null> {
  if (!KHOA) return null;
  try {
    const res = await fetch(`${GOC}${duongDan}`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": KHOA,
      },
      next: { revalidate: TTL },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Backend chết thì trang blog hiện "chưa có bài", không đổ lỗi 500 ra khách.
    return null;
  }
}

/** Ghép các bản dịch (theo ngôn ngữ) của cùng một bài thành một bản ghi. */
function ghep(ban: Partial<Record<Locale, any>>, full = false): BaiViet {
  const goc = ban[DEFAULT_LOCALE];
  const bai: BaiViet = {
    id: goc.id,
    slug: goc.slug,
    thumbnail: goc.thumbnail ?? null,
    publishedAt: goc.published_at ?? null,
    noiBat: !!goc.is_featured,
    phutDoc: Number(goc.reading_minutes ?? 1) || 1,
    tieuDe: goc.title ?? goc.slug,
    tomTat: goc.excerpt ?? "",
    ...(full
      ? {
          noiDung: goc.content ?? "",
          seoTitle: goc.seo_title ?? undefined,
          seoDescription: goc.seo_description ?? undefined,
        }
      : {}),
    tacGia: goc.author
      ? { name: goc.author.name, avatar: goc.author.avatar ?? null }
      : null,
    danhMuc: Array.isArray(goc.categories) ? goc.categories : [],
    the: Array.isArray(goc.tags) ? goc.tags : [],
  };
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    // Chưa dịch thì dùng bản ngôn ngữ gốc — thà hiện đúng nội dung bằng ngôn ngữ
    // khác còn hơn hiện ô trống hoặc chính cái slug.
    const b = ban[l];
    bai[`tieuDe${hauTo(l)}`] = b?.title ?? bai.tieuDe;
    bai[`tomTat${hauTo(l)}`] = b?.excerpt ?? bai.tomTat;
    if (full) bai[`noiDung${hauTo(l)}`] = b?.content ?? bai.noiDung;
  }
  return bai;
}

/** Gọi cùng một đường dẫn cho từng ngôn ngữ, song song. */
async function goiMoiNgonNgu<T>(
  duongDan: (locale: string) => string
): Promise<Record<Locale, T | null>> {
  const kq = await Promise.all(
    LOCALES.map((l) => goi<T>(duongDan(LOCALE_META[l].medusa)))
  );
  return Object.fromEntries(LOCALES.map((l, i) => [l, kq[i]])) as Record<Locale, T | null>;
}

/** Danh sách bài đã đăng. `danhMuc` lọc theo slug danh mục blog. */
export const layDanhSachBai = dedupeTrongMotLuotRender(
  async (opts: { danhMuc?: string; the?: string; limit?: number; offset?: number } = {}) => {
    const ts = new URLSearchParams({
      limit: String(opts.limit ?? 12),
      offset: String(opts.offset ?? 0),
    });
    if (opts.danhMuc) ts.set("category", opts.danhMuc);
    if (opts.the) ts.set("tag", opts.the);

    const ban = await goiMoiNgonNgu<{ posts: any[]; count: number }>(
      (loc) => `/store/blog/posts?${ts}&locale=${loc}`
    );
    const goc = ban[DEFAULT_LOCALE];
    const theoSlug = (l: Locale) => new Map((ban[l]?.posts ?? []).map((p: any) => [p.slug, p]));
    const bang = Object.fromEntries(LOCALES.map((l) => [l, theoSlug(l)])) as Record<Locale, Map<string, any>>;
    return {
      bai: (goc?.posts ?? []).map((p: any) =>
        ghep(Object.fromEntries(LOCALES.map((l) => [l, bang[l].get(p.slug) ?? null])), false)
      ),
      tong: goc?.count ?? 0,
    };
  }
);

/** Chi tiết một bài theo slug, kèm nội dung Markdown hai ngôn ngữ. */
export const layBai = dedupeTrongMotLuotRender(
  async (slug: string): Promise<BaiViet | null> => {
    const ban = await goiMoiNgonNgu<{ post: any }>(
      (loc) => `/store/blog/posts/${encodeURIComponent(slug)}?locale=${loc}`
    );
    const goc = ban[DEFAULT_LOCALE];
    if (!goc?.post) return null;

    const bai = ghep(
      Object.fromEntries(LOCALES.map((l) => [l, ban[l]?.post ?? null])),
      true
    );
    const lienQuan = (l: Locale) =>
      new Map((ban[l]?.post?.related ?? []).map((p: any) => [p.slug, p]));
    const bang = Object.fromEntries(LOCALES.map((l) => [l, lienQuan(l)])) as Record<Locale, Map<string, any>>;
    bai.lienQuan = (goc.post.related ?? []).map((p: any) =>
      ghep(Object.fromEntries(LOCALES.map((l) => [l, bang[l].get(p.slug) ?? null])), false)
    );
    return bai;
  }
);

/** Danh mục blog, đã sắp theo rank; tên các ngôn ngữ khác ở `nameEn`, `nameKo`… */
export const layDanhMucBlog = dedupeTrongMotLuotRender(
  async (): Promise<DanhMucBlog[]> => {
    const ban = await goiMoiNgonNgu<{ categories: DanhMucBlog[] }>(
      (loc) => `/store/blog/categories?locale=${loc}`
    );
    return (ban[DEFAULT_LOCALE]?.categories ?? []).map((c) => {
      const dm: DanhMucBlog = { ...c };
      for (const l of LOCALES) {
        if (l === DEFAULT_LOCALE) continue;
        const b = ban[l]?.categories?.find((x) => x.id === c.id);
        dm[`name${hauTo(l)}`] = b?.name ?? c.name;
      }
      return dm;
    });
  }
);

/** "2026-08-07T…" → "07/08/2026". Chuỗi rỗng nếu không có ngày. */
export function dinhDangNgay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
