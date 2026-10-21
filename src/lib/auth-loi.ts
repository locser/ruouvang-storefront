/**
 * Lỗi xác thực → khoá dịch.
 *
 * `packages/khach-hang` trả thông điệp TIẾNG VIỆT (dùng chung, có kiểm thử), nên
 * không đổi ở đó. Tầng storefront đổi từng thông điệp sang khoá `auth.err_*` để
 * giao diện hiển thị đúng ngôn ngữ. Thông điệp lạ rơi về `auth.err_busy`.
 */
export const BANG_KHOA_LOI: Record<string, string> = {
  "Email này đã được đăng ký. Anh/chị vui lòng đăng nhập.": "auth.err_dup",
  "Email hoặc mật khẩu chưa đúng.": "auth.err_bad_login",
  "Mật khẩu chưa hợp lệ — cần tối thiểu 8 ký tự.": "auth.err_password",
  "Thao tác quá nhanh, anh/chị thử lại sau ít phút giúp em.": "auth.err_rate",
  "Hệ thống đang bận, anh/chị vui lòng thử lại.": "auth.err_busy",
  "Không kết nối được máy chủ.": "auth.err_busy",
  "Thiếu CONFIG_PUBLISHABLE_KEY_MEDUSA — chưa cấu hình được tài khoản.": "auth.err_busy",
  "Anh/chị nhập đủ email và mật khẩu giúp em.": "auth.err_missing",
  "Hai lần nhập mật khẩu chưa khớp nhau.": "auth.err_mismatch",
  "Email chưa hợp lệ — anh/chị kiểm tra lại giúp em.": "auth.err_email",
  "Hệ thống đang bận, anh/chị thử lại sau ít phút hoặc gọi tổng đài giúp em.": "auth.err_reset_busy",
};

/** Đổi thông điệp tiếng Việt thành khoá dịch. */
export function khoaLoi(viText: string): string {
  return BANG_KHOA_LOI[viText] ?? "auth.err_busy";
}

/** Chỉ chấp nhận khoá lỗi đã biết, tránh hiển thị chuỗi lạ từ URL. */
export function laKhoaLoi(k: string | undefined): k is string {
  return !!k && Object.values(BANG_KHOA_LOI).includes(k);
}
