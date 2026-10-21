/**
 * Phần thuần của luồng đặt lại mật khẩu (không gọi mạng, dễ kiểm thử).
 *
 * Luật mật khẩu phải khớp `packages/khach-hang/api.ts` (đăng ký): tối thiểu 8 ký tự.
 */

export const MAT_KHAU_TOI_THIEU = 8;

/** Trả khoá dịch của lỗi đầu tiên, hoặc `null` nếu hợp lệ. */
export function kiemTraMatKhauMoi(matKhau: string, nhapLai: string): string | null {
  if (matKhau.length < MAT_KHAU_TOI_THIEU) return "auth.err_rp_short";
  if (matKhau !== nhapLai) return "auth.err_rp_mismatch";
  return null;
}

/**
 * Bộ đếm giới hạn tần suất trong bộ nhớ: tối đa `toiDa` lượt mỗi `cuaSoMs` cho mỗi khoá.
 * Chỉ chặn được trong một tiến trình; chạy nhiều instance thì cần chuyển sang Redis.
 */
export function taoBoGioiHan(toiDa: number, cuaSoMs: number) {
  const luot = new Map<string, { dem: number; hetHan: number }>();

  return function vuotGioiHan(khoa: string, bayGio: number = Date.now()): boolean {
    const m = luot.get(khoa);
    if (!m || m.hetHan <= bayGio) {
      luot.set(khoa, { dem: 1, hetHan: bayGio + cuaSoMs });
      // Dọn bớt để Map không lớn dần.
      if (luot.size > 5000) {
        for (const [k, v] of luot) if (v.hetHan <= bayGio) luot.delete(k);
      }
      return false;
    }
    m.dem += 1;
    return m.dem > toiDa;
  };
}
