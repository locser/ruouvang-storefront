import type { TrangThaiDangNhap } from "./actions";

/**
 * Trạng thái ban đầu của form đăng nhập.
 *
 * Nằm ở tệp riêng vì `actions.ts` có `"use server"`: tệp đó chỉ được export hàm
 * async. Export một hằng ở đó làm trang đăng nhập lỗi "server-side exception".
 */
export const TRANG_THAI_DAU: TrangThaiDangNhap = { loi: "", email: "" };
