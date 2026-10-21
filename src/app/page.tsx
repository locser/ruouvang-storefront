import TrangChu, { type KhoiDaNap, type NhaRuouThe } from "@/components/TrangChu";
import { doiTimSangProduct } from "@/lib/data";
import { layDanhMuc } from "@/lib/medusa-catalog";
import { laySanPhamTheoDanhMuc } from "@/lib/meili";
import { TRANG_CHU, type KhoiTrangChu } from "@/lib/theme";
import { NHA_RUOU } from "@/lib/dieu-huong";
import { tiLeAnh } from "@/lib/ti-le-anh";

/**
 * Trang chủ — Server Component.
 *
 * Toàn bộ sản phẩm được nạp TẠI MÁY CHỦ rồi truyền xuống phần giao diện tương
 * tác. Storefront anh em bản đầu render mảng mẫu cứng ra HTML rồi mới thay
 * bằng dữ liệu thật trong `useEffect`, nên Google và mọi công cụ đọc HTML tĩnh
 * chỉ thấy hàng demo.
 *
 * Cấu trúc trang chủ (thứ tự các dải, tiêu đề, tab, ảnh banner) đọc từ
 * `cwwines-theme.json` — bản bóc thật của cwwines.com. Muốn đổi thứ tự dải
 * thì sửa file JSON đó, không sửa component.
 */

export const revalidate = 60;

const SO_SP_MOI_TAB = 15;

/** Nạp sản phẩm cho một tab: handle bộ sưu tập → danh sách sản phẩm. */
async function napTab(handle: string) {
  const dm = await layDanhMuc(handle);
  if (!dm) return { handle, sanPham: [] };
  const { sanPham } = await laySanPhamTheoDanhMuc(dm.handle, SO_SP_MOI_TAB, 0);
  return { handle, sanPham: sanPham.map(doiTimSangProduct) };
}

/**
 * Số liệu THẬT của từng nhà rượu (số chai, giá thấp nhất, vài chai tiêu biểu) lấy
 * từ chính chỉ mục sản phẩm — không viết tay, nên không bao giờ lệch với kho.
 * Ảnh chọn chai lẻ có khung dọc để ba chai xếp cạnh nhau trông gọn.
 */
async function napNhaRuou(): Promise<NhaRuouThe[]> {
  const ds = await Promise.all(
    NHA_RUOU.map(async (m) => {
      const handle = m.href.replace("/danh-muc/", "");
      const dm = await layDanhMuc(handle);
      if (!dm) return null;
      const { sanPham, tong } = await laySanPhamTheoDanhMuc(dm.handle, 100, 0);
      if (sanPham.length === 0) return null;
      const gia = sanPham.map((p) => p.price_vnd).filter((g) => g > 0);
      const laThung = (t: string) => /\b(pack|case|dozen|carton)\b/i.test(t);
      const anh: string[] = [];
      for (const dem of [0, 1]) {
        // Vòng 2 (ảnh khung vuông, chai nhỏ) chỉ cứu trường hợp không có chai dọc nào.
        if (dem === 1 && anh.length > 0) break;
        for (const p of sanPham) {
          if (anh.length === 3) break;
          if (!p.thumbnail || anh.includes(p.thumbnail)) continue;
          const tl = tiLeAnh(p.thumbnail);
          if (dem === 0 && (laThung(p.title) || (tl !== null && tl < 2.2))) continue;
          anh.push(p.thumbnail);
        }
      }
      return {
        ten: m.ten,
        tenEn: m.tenEn,
        href: m.href,
        tong,
        // Chỉ khi đã thấy ĐỦ mọi chai mới dám nói "từ" giá thấp nhất.
        tuGia: tong <= sanPham.length && gia.length ? Math.min(...gia) : null,
        anh,
      } satisfies NhaRuouThe;
    })
  );
  return ds.filter((x): x is NhaRuouThe => x !== null);
}

export default async function Page() {
  const khoiCoTab = TRANG_CHU.filter((k): k is KhoiTrangChu & { tab: NonNullable<KhoiTrangChu["tab"]> } =>
    k.loai === "sanPhamTab" && Array.isArray(k.tab) && k.tab.length > 0
  );

  // Mọi tab nạp SONG SONG. Làm tuần tự thì các lượt gọi Meilisearch nối đuôi và
  // trang chủ mất vài giây mới trả về byte đầu tiên.
  const moiHandle = Array.from(
    new Set(khoiCoTab.flatMap((k) => k.tab.map((t) => t.danhMuc)))
  );
  const ketQua = await Promise.all(moiHandle.map(napTab));
  const theoHandle = new Map(ketQua.map((r) => [r.handle, r.sanPham]));

  const khoiDaNap: KhoiDaNap[] = khoiCoTab.map((k) => ({
    ...k,
    tieuDe: k.tieuDe ?? "",
    xemTatCa: k.xemTatCa ?? null,
    tab: k.tab.map((t) => ({
      ...t,
      sanPham: theoHandle.get(t.danhMuc) ?? [],
    })),
  }));

  // Dải "mới về" dùng làm lưới dự phòng: nếu vì lý do nào đó các bộ sưu tập
  // trên trang chủ rỗng, trang vẫn có hàng thật để hiện thay vì trắng trơn.
  const moiVe = (await laySanPhamTheoDanhMuc(undefined, 15, 0)).sanPham.map(
    doiTimSangProduct
  );

  const nhaRuou = await napNhaRuou();

  return <TrangChu khoi={khoiDaNap} moiVe={moiVe} nhaRuou={nhaRuou} />;
}
