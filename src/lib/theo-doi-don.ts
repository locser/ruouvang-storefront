/**
 * THEO DÕI ĐƠN HÀNG — kiểu dữ liệu, bảng trạng thái.
 *
 * Đơn thật lấy từ Medusa theo token khách (xem lib/don-cua-khach.ts).
 */

/**
 * Chỉ giữ các trạng thái suy ra được từ Medusa v2 (`order.status`,
 * `payment_status`, `fulfillment_status`). Medusa không có trạng thái "giao thất bại"
 * nên đã bỏ.
 *
 * - cho-thanh-toan: order `pending`, payment `not_paid` / `awaiting`
 * - thieu-tien:     payment `partially_captured`
 * - chuan-bi:       payment `captured`, fulfillment `not_fulfilled` / `fulfilled`
 * - dang-giao:      fulfillment `partially_shipped` / `shipped`
 * - da-giao:        fulfillment `partially_delivered` / `delivered`
 * - da-huy:         order `canceled`
 * - hoan-tien:      payment `partially_refunded` / `refunded`
 */
export type TrangThai =
  | "cho-thanh-toan"
  | "thieu-tien"
  | "chuan-bi"
  | "dang-giao"
  | "da-giao"
  | "da-huy"
  | "hoan-tien";

export type PhuongThuc = "chuyen-khoan" | "cod";

/** Một dòng trong nhật ký đơn. `truoc` = số phút trước thời điểm tra cứu. */
export interface SuKien {
  truoc: number;
  noiDung: string;
}

export interface DonTheoDoi {
  /** Mã hiển thị, ví dụ `CW100484`. */
  ma: string;
  phuongThuc: PhuongThuc;
  trangThai: TrangThai;
  /** Thời điểm đặt (ISO). */
  datLuc: string;
  hoTen: string;
  dienThoai: string;
  diaChi: string;
  monHang: Array<{ title: string; soLuong: number; thanhTien: number }>;
  phiGiaoHang: number;
  tong: number;
  /** Số tiền đã nhận (chuyển khoản) — dùng cho trường hợp chuyển thiếu / hoàn tiền. */
  daNhan?: number;
  vanChuyen?: { hang: string; maVanDon: string; duKien?: string };
  /** Lý do huỷ / giao chưa thành công. */
  lyDo?: string;
  /** Mới nhất ở đầu. */
  suKien: Array<{ luc: string; noiDung: string }>;
  /** Đơn lấy từ phiên trình duyệt (cho phép mở lại trang chuyển khoản). */
  tuPhien?: boolean;
}

export type TrangBuoc = "xong" | "hien-tai" | "canh-bao" | "cho" | "huy";
export type SacThai = "ok" | "bad" | "warn" | "info" | "muted";

export interface ThongTinTrangThai {
  nhan: string;
  sacThai: SacThai;
  /** Trạng thái từng bước trong 5 bước (đặt hàng, thanh toán/xác nhận, chuẩn bị, giao, đã giao). */
  buoc: [TrangBuoc, TrangBuoc, TrangBuoc, TrangBuoc, TrangBuoc];
}

/** Khoá giao diện (messages/*.json) cho nhãn từng trạng thái. Dùng với `<T k=…/>`. */
export const KHOA_TRANG_THAI: Record<TrangThai, string> = {
  "cho-thanh-toan": "track.st_awaiting_payment",
  "thieu-tien": "track.st_underpaid",
  "chuan-bi": "track.st_preparing",
  "dang-giao": "track.st_shipping",
  "da-giao": "track.st_delivered",
  "da-huy": "track.st_cancelled",
  "hoan-tien": "track.st_refunded",
};

export const TRANG_THAI: Record<TrangThai, ThongTinTrangThai> = {
  "cho-thanh-toan": { nhan: "Chờ thanh toán", sacThai: "warn", buoc: ["xong", "hien-tai", "cho", "cho", "cho"] },
  "thieu-tien": { nhan: "Chuyển thiếu tiền", sacThai: "warn", buoc: ["xong", "canh-bao", "cho", "cho", "cho"] },
  "chuan-bi": { nhan: "Đang chuẩn bị hàng", sacThai: "info", buoc: ["xong", "xong", "hien-tai", "cho", "cho"] },
  "dang-giao": { nhan: "Đang giao hàng", sacThai: "info", buoc: ["xong", "xong", "xong", "hien-tai", "cho"] },
  "da-giao": { nhan: "Đã giao thành công", sacThai: "ok", buoc: ["xong", "xong", "xong", "xong", "xong"] },
  "da-huy": { nhan: "Đã huỷ", sacThai: "muted", buoc: ["xong", "huy", "huy", "huy", "huy"] },
  "hoan-tien": { nhan: "Đã hoàn tiền", sacThai: "warn", buoc: ["xong", "xong", "huy", "huy", "huy"] },
};

export function tenCacBuoc(phuongThuc: PhuongThuc): [string, string, string, string, string] {
  return ["Đặt hàng", phuongThuc === "cod" ? "Xác nhận" : "Thanh toán", "Chuẩn bị hàng", "Đang giao", "Đã giao"];
}

// ── Chuẩn hoá đầu vào ───────────────────────────────────────────────────────

/** `CW-100484`, `cw100484`, `100484` → `100484`. Tách riêng phần số/chữ sau tiền tố CW. */
export function chuanHoaMa(ma: string): string {
  const sach = ma.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return sach.startsWith("CW") ? sach.slice(2) : sach;
}

/** `+84 912 345 678`, `0912.345.678` → `0912345678`. */
export function chuanHoaSdt(sdt: string): string {
  const sach = sdt.replace(/[\s.\-()]/g, "");
  return sach.replace(/^\+?84/, "0");
}

const RE_SDT = /^0\d{9}$/;
export const sdtHopLe = (sdt: string) => RE_SDT.test(chuanHoaSdt(sdt));

/** "0912345678" → "09•• ••• 678": chỉ để khách nhận ra số của mình. */
export function anSdt(sdt: string): string {
  const s = chuanHoaSdt(sdt);
  return s.length >= 10 ? `${s.slice(0, 2)}•• ••• ${s.slice(-3)}` : s;
}

export type KetQuaTraCuu = { ok: true; don: DonTheoDoi } | { ok: false; loi: "khong-thay" };
