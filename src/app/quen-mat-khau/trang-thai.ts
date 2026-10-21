import type { TrangThaiQuenMatKhau } from "./actions";

/**
 * Trạng thái ban đầu của form quên mật khẩu.
 *
 * Nằm ở tệp riêng vì `actions.ts` có `"use server"`: tệp đó chỉ được export hàm
 * async. Export một hằng ở đó làm trang bị lỗi khi chạy (xem `dang-nhap/trang-thai.ts`).
 */
export const TRANG_THAI_DAU: TrangThaiQuenMatKhau = {
  trangThai: "",
  thongBao: "",
  email: "",
};
