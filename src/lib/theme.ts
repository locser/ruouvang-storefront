/**
 * Cấu hình giao diện C.W. Wines — đọc từ `cwwines-theme.json`.
 *
 * File JSON đó là bản bóc THẬT của cwwines.com (biến CSS `:root`, cây mega
 * menu, ảnh banner, cấu trúc trang chủ), sinh ngày 07/08/2026. Bản gốc nằm ở
 * `tools/scrapers/data/cwwines-theme.json`; bản trong `src/lib` là bản chép
 * để `next build --output standalone` gom được vào ảnh Docker — thư mục
 * `scripts/` KHÔNG nằm trong ứng dụng nên không được gom theo.
 *
 * ⚠️ Sửa giao diện thì sửa file JSON, đừng rải hằng số vào từng component.
 */
import theme from "./cwwines-theme.json";
import { layMang, theoNgonNgu } from "@/i18n/translate";
import stores from "./cwwines-stores.json";

export type NgonNgu = "vi" | "en";

export interface MucCon {
  ten: string;
  tenEn: string;
  handle: string;
}

export interface CotMenu {
  ten: string;
  tenEn: string;
  handle: string;
  muc: MucCon[];
}

export interface MucMenu {
  ten: string;
  tenEn: string;
  handle: string;
  cot: CotMenu[];
}

export interface TabSanPham {
  ten: string;
  tenEn: string;
  danhMuc: string;
}

export interface KhoiTrangChu {
  loai: string;
  tieuDe?: string;
  tieuDeEn?: string;
  xemTatCa?: string;
  tab?: TabSanPham[];
}

export interface CuaHang {
  ten: string;
  tenEn?: string;
  slug: string;
  diaChiNgan: string;
  diaChiNganEn?: string;
  diaChi: string;
  diaChiEn?: string;
  dienThoai: string[];
  googleMaps?: string;
  embed: string;
  lat: number;
  lng: number;
  laTruSo?: boolean;
  laShowroom?: boolean;
}

export interface TinhThanh {
  ten: string;
  tenEn?: string;
  slug: string;
  banDoTong?: string;
  cuaHang: CuaHang[];
}

export const THUONG_HIEU = theme.thuongHieu;
export const MAU = theme.mau;
export const ANH = theme.anh;
export const THANH_TREN_CUNG = theme.thanhTrenCung;
export const CAM_KET = theme.camKet;
export const CAM_KET_THEO_NGON_NGU = theoNgonNgu((l) => layMang(theme, "camKet", l));
export const KHUYEN_MAI = theme.khuyenMai;

/** Collection không có sản phẩm bán được trong dữ liệu nguồn ngày 19/08/2026. */
export const DANH_MUC_RONG = [
  "boisterous",
  "cw-winemaker-series",
  "glenunga-fc",
  "guide-dogs",
  "frontpage",
  "king-tide",
  "kips-club",
  "lustre-collection",
  "peeping-tom",
  "quarry",
  "ribbon",
  "schild-estate-x-enoteca-nfwf-2026",
  "starling",
] as const;

const TAP_HOP_DANH_MUC_RONG = new Set<string>(DANH_MUC_RONG);

/** Không đưa collection rỗng lên các bề mặt điều hướng. */
export function danhMucHienTrongDieuHuong(handle: string): boolean {
  return !TAP_HOP_DANH_MUC_RONG.has(handle);
}

export const MENU = (theme.menu as unknown as MucMenu[])
  .filter((muc) => danhMucHienTrongDieuHuong(muc.handle))
  .map((muc) => ({
    ...muc,
    cot: muc.cot
      .filter((cot) => danhMucHienTrongDieuHuong(cot.handle))
      .map((cot) => ({
        ...cot,
        muc: cot.muc.filter((mucCon) => danhMucHienTrongDieuHuong(mucCon.handle)),
      })),
  }));
export const TRANG_CHU = theme.trangChu as unknown as KhoiTrangChu[];
export const FOOTER = {
  ...theme.footer,
  cot: theme.footer.cot.map((cot) => ({
    ...cot,
    muc: cot.muc.filter((muc) => {
      const khop = muc.duongDan.match(/^\/danh-muc\/([^/?#]+)$/);
      return !khop || danhMucHienTrongDieuHuong(khop[1]);
    }),
  })),
};
export const CHAN_TUOI = theme.chanTuoi;

export const HE_THONG_CUA_HANG = stores;
export const TINH_THANH = stores.tinhThanh as unknown as TinhThanh[];

/** Tổng số cửa hàng — dùng ở khối "chuỗi N cửa hàng" trên trang chủ. */
export const SO_CUA_HANG = TINH_THANH.reduce((s, t) => s + t.cuaHang.length, 0);

/**
 * Đường dẫn danh mục trên storefront.
 *
 * Site gốc dùng `/collections/<handle>`; bản này dùng `/danh-muc/<handle>` cho
 * đồng bộ với sáu storefront anh em. Handle gốc của Shopify giúp link cũ
 * từ Google vẫn ánh xạ 1–1 sang được.
 */
export function duongDanDanhMuc(handle: string): string {
  return `/danh-muc/${handle}`;
}

export function duongDanSanPham(handle: string): string {
  return `/san-pham/${handle}`;
}
