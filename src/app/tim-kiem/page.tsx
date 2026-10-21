import type { Metadata } from "next";
import Link from "next/link";
import TheSanPham from "@/components/TheSanPham";
import { MOI_TRANG, timSanPham, type SanPhamTim } from "@/lib/meili";
import { doiTimSangProduct } from "@/lib/data";

/**
 * Trang kết quả tìm kiếm — Server Component, hỏi thẳng Meilisearch.
 *
 * ⚠️ Giá ở đây lấy từ Meilisearch nên có độ trễ tới 60 giây so với Medusa
 * (ADR-008). Con số này chỉ để khách duyệt hàng; giá chốt đơn LUÔN đọc lại từ
 * Medusa ở trang chi tiết và ở giỏ hàng.
 *
 * Bộ lọc (loại, giá) và sắp xếp chỉ áp cho các sản phẩm của TRANG ĐANG XEM
 * (tối đa MOI_TRANG). Lọc trên toàn bộ kết quả cần Meilisearch có thuộc tính
 * sắp xếp/lọc được cấu hình — chưa làm ở đây.
 *
 * Form lọc là GET thật nên chạy cả khi chưa có JavaScript.
 */

export const dynamic = "force-dynamic";

type Loai = "all" | "single" | "pack";
type Gia = "all" | "lt300" | "300-400" | "gt400";
type SapXep = "rel" | "pa" | "pd" | "az";

interface Props {
  searchParams: Promise<{ q?: string; trang?: string; loai?: string; gia?: string; sx?: string }>;
}

const NHAN_LOAI: Record<Loai, string> = { all: "Tất cả", single: "Chai lẻ", pack: "Thùng" };
const NHAN_GIA: Record<Gia, string> = {
  all: "Tất cả",
  lt300: "Dưới 300.000đ",
  "300-400": "300.000đ – 400.000đ",
  gt400: "Trên 400.000đ",
};
const NHAN_SAP_XEP: Record<SapXep, string> = {
  rel: "Liên quan nhất",
  pa: "Giá thấp đến cao",
  pd: "Giá cao đến thấp",
  az: "Tên A đến Z",
};

const laThung = (ten: string) => /thùng|\bpack\b|\bcase\b|\bdozen\b|\bcarton\b/i.test(ten);

/** Số chai trong một sản phẩm: "Thùng 6 chai" → 6, chai lẻ → 1. */
function soChai(ten: string): number {
  if (!laThung(ten)) return 1;
  const m = ten.match(/(\d+)\s*chai/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

function giaMoiChai(p: SanPhamTim): number {
  return p.price_vnd / soChai(p.title);
}

function chonLoai(v: string | undefined): Loai {
  return v === "single" || v === "pack" ? v : "all";
}
function chonGia(v: string | undefined): Gia {
  return v === "lt300" || v === "300-400" || v === "gt400" ? v : "all";
}
function chonSapXep(v: string | undefined): SapXep {
  return v === "pa" || v === "pd" || v === "az" ? v : "rel";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Tìm "${q}" — C.W. Wines` : "Tìm kiếm — C.W. Wines",
    robots: { index: false },
  };
}

export default async function TrangTimKiem({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const trang = Math.max(1, parseInt(sp.trang ?? "1", 10) || 1);
  const loai = chonLoai(sp.loai);
  const gia = chonGia(sp.gia);
  const sx = chonSapXep(sp.sx);

  const { sanPham, tong } = q ? await timSanPham(q, trang) : { sanPham: [], tong: 0 };
  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  // Lọc + sắp xếp trên trang đang xem.
  let ds = sanPham.filter((p) => {
    if (loai === "single" && laThung(p.title)) return false;
    if (loai === "pack" && !laThung(p.title)) return false;
    const gm = giaMoiChai(p);
    if (gia === "lt300" && !(gm < 300000)) return false;
    if (gia === "300-400" && !(gm >= 300000 && gm <= 400000)) return false;
    if (gia === "gt400" && !(gm > 400000)) return false;
    return true;
  });
  if (sx === "pa") ds = [...ds].sort((a, b) => giaMoiChai(a) - giaMoiChai(b));
  if (sx === "pd") ds = [...ds].sort((a, b) => giaMoiChai(b) - giaMoiChai(a));
  if (sx === "az") ds = [...ds].sort((a, b) => a.title.localeCompare(b.title, "vi"));

  /** Đường dẫn giữ nguyên bộ lọc hiện tại, ghi đè những gì truyền vào. */
  const href = (ghiDe: Partial<Record<"q" | "trang" | "loai" | "gia" | "sx", string>>) => {
    const p = new URLSearchParams();
    const day = { q, loai, gia, sx, ...ghiDe };
    if (day.q) p.set("q", day.q);
    if (day.loai !== "all") p.set("loai", day.loai);
    if (day.gia !== "all") p.set("gia", day.gia);
    if (day.sx !== "rel") p.set("sx", day.sx);
    if (ghiDe.trang && ghiDe.trang !== "1") p.set("trang", ghiDe.trang);
    return `/tim-kiem?${p.toString()}`;
  };

  const coBoLoc = loai !== "all" || gia !== "all" || sx !== "rel";

  return (
    <div className="container-site py-6">
      <nav aria-label="Đường dẫn" className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
        <Link href="/" className="hover:text-ink">
          Trang chủ
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink">
          Tìm kiếm
        </span>
      </nav>

      <div className="grid gap-5 border-b border-line pb-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] md:items-end">
        <div>
          <h1 className="m-0 font-display text-[clamp(34px,5vw,52px)] font-medium leading-[1.05] text-ink">
            {q ? (
              <>
                Kết quả cho <em className="italic text-wine">“{q}”</em>
              </>
            ) : (
              "Tìm kiếm sản phẩm"
            )}
          </h1>
          {q && (
            <p className="mt-2 text-[15px] text-ink-soft" role="status" aria-live="polite">
              {tong.toLocaleString("vi-VN")} sản phẩm
            </p>
          )}
        </div>

        <form role="search" action="/tim-kiem" method="get" className="flex items-center gap-2 border-b border-ink pb-1">
          <label htmlFor="q-tim" className="sr-only">
            Tìm rượu vang
          </label>
          <input
            id="q-tim"
            name="q"
            type="search"
            defaultValue={q}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Tên rượu, loại vang, nhà rượu…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button type="submit" className="btn-wine !min-h-[44px] !px-5">
            Tìm
          </button>
        </form>
      </div>

      {q && sanPham.length > 0 && (
        <div className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div
            role="group"
            aria-label="Loại sản phẩm"
            className="cuon-ngang -mx-5 flex items-center gap-x-9 overflow-x-auto px-5 md:mx-0 md:justify-center md:px-0"
          >
            {(Object.keys(NHAN_LOAI) as Loai[]).map((k) => {
              const dang = loai === k;
              return (
                <Link
                  key={k}
                  href={href({ loai: k, trang: "1" })}
                  aria-current={dang ? "true" : undefined}
                  className={`relative shrink-0 whitespace-nowrap py-3 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                    dang ? "text-wine" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {NHAN_LOAI[k]}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-px origin-center bg-copper transition-transform duration-500 ease-cellar ${
                      dang ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <form action="/tim-kiem" method="get" className="flex flex-wrap items-center gap-3 text-[13px] text-ink-soft">
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="loai" value={loai} />
            <label className="flex items-center gap-2">
              Giá mỗi chai
              <select name="gia" defaultValue={gia} className="min-h-[44px] border border-ink/40 bg-white px-3 text-[14px] text-ink">
                {(Object.keys(NHAN_GIA) as Gia[]).map((k) => (
                  <option key={k} value={k}>
                    {NHAN_GIA[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Sắp xếp
              <select name="sx" defaultValue={sx} className="min-h-[44px] border border-ink/40 bg-white px-3 text-[14px] text-ink">
                {(Object.keys(NHAN_SAP_XEP) as SapXep[]).map((k) => (
                  <option key={k} value={k}>
                    {NHAN_SAP_XEP[k]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-wine-outline !min-h-[44px] !px-4">
              Áp dụng
            </button>
          </form>
        </div>
      )}

      {!q ? (
        <p className="py-10 text-center text-[15px] text-ink-muted">
          Nhập tên sản phẩm hoặc thương hiệu vào ô tìm kiếm phía trên.
        </p>
      ) : sanPham.length === 0 ? (
        <div className="mx-auto max-w-xl py-14 text-center">
          <h2 className="font-display text-[32px] font-medium text-ink sm:text-[40px]">
            Không tìm thấy “{q}”
          </h2>
          <ul className="mx-auto mt-6 max-w-[380px] list-none space-y-2 p-0 text-left text-[14px] text-ink-soft">
            <li>Kiểm tra lại chính tả, gõ không dấu cũng được</li>
            <li>Thử từ ngắn hơn, ví dụ “vang hồng”</li>
            <li>Hoặc xem theo danh mục để tìm rượu phù hợp</li>
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/danh-muc" className="btn-wine">
              Xem theo danh mục
            </Link>
          </div>
        </div>
      ) : ds.length === 0 ? (
        <div className="mx-auto max-w-xl py-14 text-center">
          <h2 className="font-display text-[32px] font-medium text-ink sm:text-[40px]">
            Không có rượu phù hợp bộ lọc
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft">Thử bỏ bớt bộ lọc để xem thêm sản phẩm.</p>
          <div className="mt-8">
            <Link href={href({ loai: "all", gia: "all", sx: "rel", trang: "1" })} className="btn-wine">
              Xóa bộ lọc
            </Link>
          </div>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-12 p-0 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {ds.map((p) => (
            <li key={p.id}>
              <TheSanPham product={doiTimSangProduct(p)} />
            </li>
          ))}
        </ul>
      )}

      {coBoLoc && sanPham.length > 0 && ds.length > 0 && (
        <p className="mt-6 text-center text-[12px] text-ink-faint">
          Bộ lọc và sắp xếp chỉ áp cho {sanPham.length} sản phẩm của trang này.
        </p>
      )}

      {soTrang > 1 && (
        <nav aria-label="Phân trang" className="mt-12 flex items-center justify-center gap-4 text-[13px]">
          {trang > 1 && (
            <Link href={href({ trang: String(trang - 1) })} className="btn-wine-outline !min-h-[44px] !px-5">
              ← Trang trước
            </Link>
          )}
          <span className="text-ink-muted">
            Trang {trang} / {soTrang}
          </span>
          {trang < soTrang && (
            <Link href={href({ trang: String(trang + 1) })} className="btn-wine-outline !min-h-[44px] !px-5">
              Trang sau →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
