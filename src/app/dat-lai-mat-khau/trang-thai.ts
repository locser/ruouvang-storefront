import type { TrangThaiDatLai } from "./actions";

/**
 * Trạng thái ban đầu của form đặt mật khẩu mới.
 *
 * Nằm ở tệp riêng vì `actions.ts` có `"use server"`: tệp đó chỉ được export hàm async.
 */
export const TRANG_THAI_DAU: TrangThaiDatLai = { trangThai: "", thongBao: "" };
