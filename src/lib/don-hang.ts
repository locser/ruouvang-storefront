/**
 * ĐƠN HÀNG VỪA ĐẶT — sinh mã đơn và giữ thông tin cho trang xác nhận.
 *
 * Vì sao có file này (báo cáo kiểm thử 05/08/2026):
 *
 *   · BUG-R26 — mã đơn hàng bị GÁN CỨNG `RA-771092` ngay trong JSX của trang
 *     `/dat-hang-thanh-cong`. Hai đơn khác nhau, hai trình duyệt khác nhau, vẫn
 *     ra đúng một mã. Không tra cứu được, không đối soát được với vận chuyển
 *     hay kế toán. Cùng một lỗi với hai site anh em (Hasaki `HSAK-771092`,
 *     Coolmate `COOL-892301`) nên chữa ở đây phải chữa cho tử tế.
 *
 *   · BUG-R27 — trang xác nhận luôn chào "CẢM ƠN ANH SỸ" bất kể khách nhập tên
 *     gì, và không hiện địa chỉ, số điện thoại hay danh sách sản phẩm.
 *
 *   · BUG-R28 — mở thẳng `/dat-hang-thanh-cong` khi chưa đặt hàng vẫn thấy một
 *     đơn hàng đầy đủ. Nay không có đơn trong phiên thì trang tự đưa về giỏ.
 *
 * ⚠️ Đây vẫn là bản LƯU PHÍA TRÌNH DUYỆT. Đơn thật trong Medusa chưa được tạo
 * (xem ghi chú ở `app/thanh-toan/page.tsx`). Khi nối `POST /store/carts/:id/
 * complete`, hãy lấy `display_id` thật của Medusa thay cho `taoMaDonHang()`.
 */

import { KHOA_DON_VUA_DAT } from "./gio-hang-context";

export interface MonTrongDon {
  title: string;
  sku: string;
  soLuong: number;
  thanhTien: number;
}

export interface DonVuaDat {
  maDon: string;
  /** Thời điểm đặt, dạng ISO — trang xác nhận tự định dạng lại theo giờ Việt Nam. */
  datLuc: string;
  hoTen: string;
  dienThoai: string;
  diaChi: string;
  /** Tên phương thức giao hàng khách đã chọn. */
  giaoHang: string;
  /** Phí giao hàng, đơn vị đồng. */
  phiGiaoHang: number;
  /** Tên hình thức thanh toán khách đã chọn. */
  thanhToan: string;
  /** Mã hình thức thanh toán; thiếu (đơn cũ trong phiên) thì hiểu là COD. */
  phuongThuc?: "cod" | "chuyen-khoan";
  monHang: MonTrongDon[];
  tamTinh: number;
  maGiamGia: string | null;
  tienGiamMa: number;
  tongThanhToan: number;
}

/**
 * Sinh mã đơn hàng: `RA-<yymmdd>-<5 ký tự>`, ví dụ `RA-260807-K3M9Q`.
 *
 * Phần ngày giúp nhân viên nhìn mã là biết đơn của hôm nào; năm ký tự ngẫu
 * nhiên lấy từ `crypto.getRandomValues` (có sẵn trên mọi trình duyệt hiện đại
 * và cả Node 19+), rơi về `Math.random` nếu môi trường không có.
 */
export function taoMaDonHang(mocThoiGian: Date = new Date()): string {
  const hai = (n: number) => String(n).padStart(2, "0");
  const ngay =
    hai(mocThoiGian.getFullYear() % 100) +
    hai(mocThoiGian.getMonth() + 1) +
    hai(mocThoiGian.getDate());

  // Bỏ các ký tự dễ đọc nhầm khi nhân viên đọc mã qua điện thoại: 0/O, 1/I.
  const BANG_CHU = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const DAI = 5;

  let ngauNhien = "";
  const nguon =
    typeof globalThis.crypto?.getRandomValues === "function"
      ? globalThis.crypto.getRandomValues(new Uint32Array(DAI))
      : null;

  for (let i = 0; i < DAI; i++) {
    const so = nguon ? nguon[i] : Math.floor(Math.random() * 0xffffffff);
    ngauNhien += BANG_CHU[so % BANG_CHU.length];
  }

  return `CW-${ngay}-${ngauNhien}`;
}

/**
 * Mã hiển thị của đơn, dùng chung cho trang xác nhận, chuyển khoản và theo dõi đơn:
 * mã Medusa `12` → `CW12`; mã dự phòng `CW-260807-K3M9Q` → `CW260807K3M9Q`.
 */
export function maHienThiDon(maDon: string): string {
  const sach = maDon.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return sach.startsWith("CW") ? sach : `CW${sach}`;
}

/** Cất đơn vừa đặt vào sessionStorage để trang xác nhận đọc lại. */
export function luuDonVuaDat(don: DonVuaDat): void {
  try {
    window.sessionStorage.setItem(KHOA_DON_VUA_DAT, JSON.stringify(don));
  } catch {
    // Trình duyệt chặn sessionStorage — trang xác nhận sẽ đưa khách về giỏ hàng.
  }
}

/** Đọc đơn vừa đặt. Trả null nếu phiên này chưa đặt đơn nào. */
export function docDonVuaDat(): DonVuaDat | null {
  try {
    const raw = window.sessionStorage.getItem(KHOA_DON_VUA_DAT);
    if (!raw) return null;

    const d = JSON.parse(raw);
    // Kiểm tra tối thiểu: dữ liệu hỏng thì coi như chưa có đơn, đừng render nửa vời.
    if (!d || typeof d.maDon !== "string" || !Array.isArray(d.monHang)) return null;
    return d as DonVuaDat;
  } catch {
    return null;
  }
}

/** Xoá đơn khỏi phiên — dùng khi khách bấm quay về trang chủ. */
export function xoaDonVuaDat(): void {
  try {
    window.sessionStorage.removeItem(KHOA_DON_VUA_DAT);
  } catch {
    // Không xoá được cũng không sao: sessionStorage tự hết khi đóng tab.
  }
}

/** Định dạng thời điểm đặt hàng theo giờ Việt Nam: "07/08/2026 lúc 15:42". */
export function dinhDangThoiDiem(iso: string, luc = "lúc"): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const hai = (n: number) => String(n).padStart(2, "0");
  return `${hai(t.getDate())}/${hai(t.getMonth() + 1)}/${t.getFullYear()} ${luc} ${hai(
    t.getHours()
  )}:${hai(t.getMinutes())}`;
}
