import { NextResponse } from "next/server";
import { MOI_TRANG, layDanhMucKemConChau } from "@/lib/medusa-catalog";
import { laySanPhamTheoDanhMuc } from "@/lib/meili";

/**
 * Trang sản phẩm tiếp theo của một danh mục — phục vụ cuộn vô hạn.
 *
 * Trình duyệt chỉ gửi `handle` và số trang; việc tra danh mục con cháu và gọi
 * Store API vẫn nằm phía server, nên `CONFIG_PUBLISHABLE_KEY_MEDUSA` không lọt ra
 * ngoài. Client không tự truyền id danh mục để tránh mò sang shop khác.
 */
export async function GET(request: Request) {
  const thamSo = new URL(request.url).searchParams;
  const handle = (thamSo.get("handle") ?? "").trim();
  const trangRaw = Number(thamSo.get("trang") ?? 1);
  const trang = Math.max(1, Number.isFinite(trangRaw) ? trangRaw : 1);

  if (!handle) {
    return NextResponse.json({ sanPham: [], tong: 0 }, { status: 400 });
  }

  const ketQua = await layDanhMucKemConChau(handle);
  if (!ketQua) {
    return NextResponse.json({ sanPham: [], tong: 0 }, { status: 404 });
  }

  const { sanPham, tong } = await laySanPhamTheoDanhMuc(
    ketQua.danhMuc.handle,
    MOI_TRANG,
    (trang - 1) * MOI_TRANG
  );

  return NextResponse.json(
    {
      tong,
      sanPham: sanPham.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        thumbnail: p.thumbnail,
        gia: p.price_vnd,
        giaGoc: null,
        tonKho: { soLuong: 99, conHang: true, sapHet: false },
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } }
  );
}
