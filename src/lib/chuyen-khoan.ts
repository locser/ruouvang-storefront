/**
 * THANH TOÁN CHUYỂN KHOẢN — cấu hình tài khoản nhận tiền, mã nội dung và URL VietQR.
 *
 * Thông tin tài khoản lấy từ cấu hình cửa hàng của Medusa (`layCaiDat()`, các khoá bank_name,
 * bank_account, bank_account_name, bank_bin). Server component đọc rồi đưa xuống
 * client qua `CaiDatProvider`; client dùng hook `useNganHang()`.
 *
 * Thiếu tên ngân hàng, số tài khoản hoặc tên chủ tài khoản thì tuỳ chọn
 * "Chuyển khoản" KHÔNG hiện ở bước thanh toán. `bank_bin` là tuỳ chọn: có thì vẽ
 * QR thật từ img.vietqr.io, không có thì chỉ hiện thông tin chuyển thủ công.
 */
import type { CaiDat } from "@/lib/lay-cai-dat";

/** Thời gian giữ mã chuyển khoản trước khi báo hết hạn. */
export const HAN_CHUYEN_KHOAN_PHUT = 15;

/** Chu kỳ tự hỏi lại trạng thái giao dịch khi đang chờ (ms). */
export const CHU_KY_KIEM_TRA_MS = 10_000;

/** Khoá sessionStorage lưu hạn mới khi khách bấm "Tạo mã thanh toán mới". */
export const KHOA_HAN_CHUYEN_KHOAN = "cwwines-han-chuyen-khoan";

/** Khoá hạn riêng cho từng đơn: đơn mới không được thừa hưởng hạn của đơn cũ trong cùng phiên. */
export const khoaHanCuaDon = (maDon: string) => `${KHOA_HAN_CHUYEN_KHOAN}:${maDon}`;

export interface NganHang {
  ten: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  maVietQR: string;
  /** Chưa khai số tài khoản. */
  laMau: boolean;
}

export function nganHangTuCaiDat(cd: CaiDat): NganHang {
  const stk = (cd.bank_account ?? "").replace(/\s/g, "");
  return {
    ten: (cd.bank_name ?? "").trim(),
    soTaiKhoan: stk,
    chuTaiKhoan: (cd.bank_account_name ?? "").trim(),
    maVietQR: (cd.bank_bin ?? "").trim(),
    laMau: !stk,
  };
}

/** Cửa hàng đã khai đủ tài khoản để nhận chuyển khoản. */
export const chuyenKhoanSanSang = (nh: NganHang): boolean =>
  Boolean(nh.ten && nh.soTaiKhoan && nh.chuTaiKhoan);

/**
 * Nội dung chuyển khoản: `CW` + mã đơn bỏ mọi ký tự không phải chữ/số — nhiều
 * ngân hàng cắt hoặc từ chối dấu gạch. Mã Medusa `12` → `CW12`;
 * mã dự phòng `CW-260807-K3M9Q` → `CW260807K3M9Q`.
 */
export function noiDungChuyenKhoan(maDon: string): string {
  const sach = maDon.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return sach.startsWith("CW") ? sach : `CW${sach}`;
}

/** "0123456789" → "0123 4567 89": dễ đọc hơn, vẫn sao chép được dạng liền. */
export function nhomSoTaiKhoan(stk: string): string {
  return stk.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/**
 * Ảnh QR VietQR (img.vietqr.io) điền sẵn số tiền và nội dung. Trả null khi chưa
 * khai `bank_bin`.
 *
 * ⚠️ Trình duyệt của khách sẽ gọi tới img.vietqr.io kèm số tài khoản, số tiền và
 * nội dung — đó là cách dịch vụ này hoạt động. Nếu không muốn, để trống
 * `bank_bin`, hoặc tự sinh QR phía máy chủ.
 */
export function urlVietQR(soTien: number, noiDung: string, nh: NganHang): string | null {
  const { maVietQR, soTaiKhoan, chuTaiKhoan } = nh;
  if (!maVietQR || !soTaiKhoan) return null;
  const ts = new URLSearchParams({
    amount: String(Math.round(soTien)),
    addInfo: noiDung,
    accountName: chuTaiKhoan,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(maVietQR)}-${encodeURIComponent(
    soTaiKhoan
  )}-compact2.png?${ts}`;
}

export type KetQuaGiaoDich =
  | { trangThai: "cho" }
  | { trangThai: "du" }
  | { trangThai: "thieu"; daNhan: number };

/**
 * Hỏi xem tiền đã về chưa — ĐIỂM NỐI duy nhất với phía ngân hàng.
 *
 * ⚠️ CHƯA NỐI: hàm luôn trả "cho" nên trang không bao giờ tự sang "thành công".
 * Để chạy thật cần một dịch vụ đối soát (webhook ngân hàng như SePay/Casso, hoặc
 * API ngân hàng) cập nhật trạng thái thanh toán của đơn trong Medusa; khi đó chỉ
 * việc đổi thân hàm này thành lời gọi tới route đọc trạng thái đó — giao diện
 * (đồng hồ, tự hỏi lại, nút "Tôi đã chuyển khoản", 3 trạng thái) không phải sửa.
 */
export async function kiemTraGiaoDich(_maDon: string): Promise<KetQuaGiaoDich> {
  return { trangThai: "cho" };
}
