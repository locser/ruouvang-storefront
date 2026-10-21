import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  layCayDanhMuc,
  layDanhMucKemConChau,
} from "@/lib/medusa-catalog";
import LuoiSanPhamLoc from "@/components/LuoiSanPhamLoc";
import ThanhLocDanhMuc from "@/components/ThanhLocDanhMuc";
import {
  KIEU_SAP_XEP,
  MOI_TRANG_LOC,
  NHOM_LOC,
  locSanPham,
  type LuaChonLoc,
  type MaNhomLoc,
  type MaSapXep,
} from "@/lib/loc-danh-muc";
import { danhMucHienTrongDieuHuong } from "@/lib/theme";
import T from "@/components/T";

/**
 * Trang danh mục.
 *
 * Bản trước KHÔNG đọc danh mục: nó tải toàn bộ sản phẩm rồi so chuỗi handle,
 * và khi so trượt thì `filtered.length > 0 ? filtered : allProducts` khiến mọi
 * URL — kể cả URL bịa — đều trả về 200 kèm nguyên danh sách sản phẩm. Ở đây
 * danh mục được tra thẳng từ Medusa, không có đường lui: sai handle là 404.
 *
 * SỬA BUG-R06 (kiểm thử 05/08/2026): bổ sung bộ lọc (khoảng giá, quốc gia, vùng
 * trồng, giống nho, dung tích) và sắp xếp (giá tăng/giảm, mới cập nhật). Hai
 * nhánh hiển thị:
 *
 *   · KHÔNG lọc → tiếp tục cuộn vô hạn qua Medusa như cũ (tốt cho lần tải đầu
 *     và cho SEO, và không phụ thuộc Meilisearch);
 *   · CÓ lọc    → truy vấn Meilisearch rồi phân trang bằng liên kết.
 *
 * Meilisearch hỏng hoặc chưa khai `filterableAttributes` thì `locSanPham()` trả
 * null và trang rơi về nhánh thứ nhất — mất bộ lọc chứ không mất trang.
 */

export const dynamicParams = true;
export const revalidate = 60;

interface ThamSo {
  trang?: string;
  sap?: string;
  gia?: string;
  "quoc-gia"?: string;
  "vung-trong"?: string;
  "giong-nho"?: string;
  "dung-tich"?: string;
}

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<ThamSo>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const ketQua = await layDanhMucKemConChau(handle);
  const danhMuc = ketQua?.danhMuc;

  if (!danhMuc) {
    return { title: "Không tìm thấy danh mục" };
  }

  // SỬA BUG-R04: mô tả cũ là "Đền 200% nếu phát hiện hàng giả" — cam kết của
  // website mỹ phẩm Hasaki, không phải chính sách của C.W. Wines.
  return {
    title: danhMuc.name,
    description: `Mua ${danhMuc.name} nhập khẩu chính ngạch tại C.W. Wines — đầy đủ chứng từ, tem nhãn phụ và hoá đơn VAT. Giao tận nơi toàn quốc.`,
    alternates: { canonical: `/danh-muc/${handle}` },
  };
}

/** Đọc tham số lọc từ URL, bỏ qua giá trị lạ thay vì để nguyên. */
function docLuaChon(handleDanhMuc: string, ts: ThamSo): LuaChonLoc {
  const sapHopLe = KIEU_SAP_XEP.some((s) => s.ma === ts.sap);

  const thuocTinh: Partial<Record<MaNhomLoc, string>> = {};
  for (const nhom of NHOM_LOC) {
    const gt = ts[nhom.ma];
    if (typeof gt === "string" && gt.trim() !== "") thuocTinh[nhom.ma] = gt.trim();
  }

  return {
    handleDanhMuc,
    trang: Math.max(1, parseInt(ts.trang ?? "1", 10) || 1),
    sapXep: (sapHopLe ? ts.sap : "lien-quan") as MaSapXep,
    khoangGia: ts.gia?.trim() || null,
    thuocTinh,
  };
}

export default async function TrangDanhMuc({ params, searchParams }: Props) {
  const { handle } = await params;
  const ts = await searchParams;

  const ketQua = await layDanhMucKemConChau(handle);
  // Handle không có thật → 404. Không bao giờ đổ đại danh sách khác ra cho khách.
  if (!ketQua) notFound();
  const { danhMuc } = ketQua;

  const luaChon = docLuaChon(danhMuc.handle, ts);

  // Mọi danh sách chỉ để xem đều đi Meilisearch; Medusa chỉ giữ vai trò cây
  // danh mục, chi tiết sản phẩm, giỏ hàng và checkout.
  const ketQuaLoc = await locSanPham(luaChon);
  const tong = ketQuaLoc?.tong ?? 0;

  // Danh mục anh em để khách nhảy ngang, lấy từ cây thật của shop.
  const cay = await layCayDanhMuc();
  const danhMucKhac = cay
    .filter(
      (c) => c.handle !== danhMuc.handle && danhMucHienTrongDieuHuong(c.handle)
    )
    .slice(0, 12);

  /** Bảo toàn mọi bộ lọc khi bấm sang trang khác. */
  const duongDanTrang = (n: number) => {
    const p = new URLSearchParams();
    if (luaChon.sapXep !== "lien-quan") p.set("sap", luaChon.sapXep);
    if (luaChon.khoangGia) p.set("gia", luaChon.khoangGia);
    for (const nhom of NHOM_LOC) {
      const gt = luaChon.thuocTinh[nhom.ma];
      if (gt) p.set(nhom.ma, gt);
    }
    if (n > 1) p.set("trang", String(n));
    const chuoi = p.toString();
    return chuoi ? `/danh-muc/${handle}?${chuoi}` : `/danh-muc/${handle}`;
  };

  return (
    <div className="container-site py-8 md:py-12">
      <nav
        aria-label="Đường dẫn"
        className="mb-6 hidden flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-soft sm:flex md:mb-8"
      >
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <Link href="/danh-muc" className="transition-colors hover:text-wine">
          <T k="category.collections" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <span aria-current="page" className="text-ink">{danhMuc.name}</span>
      </nav>

      <header className="mb-8 text-center md:mb-14">
        <p className="nhan-nho mb-3 md:mb-4"><T k="category.category" /></p>
        <h1 className="tieu-de-section gach-tieu-de">{danhMuc.name}</h1>
        <p className="mt-4 hidden text-[13px] tracking-wide text-ink-muted md:block">
          {tong.toLocaleString("vi-VN")} <T k="common.products" />
        </p>
      </header>

      {!ketQuaLoc ? (
        <p className="py-16 text-center font-display text-[24px] italic text-ink-muted">
          <T k="category.the_product_list_is_temporarily" />
        </p>
      ) : (
        <>
          <ThanhLocDanhMuc
            handle={handle}
            luaChon={luaChon}
            facet={ketQuaLoc.facet}
            tong={ketQuaLoc.tong}
          />
          <LuoiSanPhamLoc
            sanPham={ketQuaLoc.sanPham}
            trang={luaChon.trang}
            soTrang={Math.max(1, Math.ceil(ketQuaLoc.tong / MOI_TRANG_LOC))}
            duongDanTrang={duongDanTrang}
          />
        </>
      )}

      {danhMucKhac.length > 0 && (
        <section className="mt-24 border-t border-line pt-14 text-center">
          <h2 className="mb-8 text-[30px] md:text-[36px]"><T k="category.explore_more" /></h2>
          <div className="flex flex-wrap justify-center gap-2">
            {danhMucKhac.map((c) => (
              <Link
                key={c.id}
                href={`/danh-muc/${c.handle}`}
                className="inline-flex min-h-[38px] items-center border border-ink/20 px-4 py-1.5 text-[12px] font-medium tracking-wide text-ink transition-colors duration-300 hover:border-wine hover:bg-wine hover:text-page"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
