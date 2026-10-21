"use server";

import { kiemTraMatKhauMoi } from "@/lib/dat-lai-mat-khau";

/**
 * Đặt mật khẩu mới bằng token trong email (Medusa v2):
 *   POST /auth/customer/emailpass/update   Authorization: Bearer <token>   { password }
 * Token xác định tài khoản (backend lấy `actor_id` từ token), nên không gửi email lên.
 *
 * ⚠️ Token là bí mật dùng một lần: KHÔNG ghi log, KHÔNG trả lại cho trình duyệt.
 */

export interface TrangThaiDatLai {
  /** "" · "ok" · "loi" */
  trangThai: "" | "ok" | "loi";
  /** Khoá dịch (auth.*), hiển thị bằng <T>. */
  thongBao: string;
}

export async function xuLyDatLaiMatKhau(
  _truoc: TrangThaiDatLai,
  formData: FormData
): Promise<TrangThaiDatLai> {
  const token = String(formData.get("token") || "").trim();
  const matKhau = String(formData.get("matKhau") || "");
  const nhapLai = String(formData.get("nhapLai") || "");

  if (!token) return { trangThai: "loi", thongBao: "auth.err_rp_token" };

  const loi = kiemTraMatKhauMoi(matKhau, nhapLai);
  if (loi) return { trangThai: "loi", thongBao: loi };

  const goc = process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000";
  try {
    const res = await fetch(`${goc}/auth/customer/emailpass/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: matKhau }),
      cache: "no-store",
    });
    if (res.ok) return { trangThai: "ok", thongBao: "auth.rp_ok" };
    // Token sai, hết hạn hoặc đã dùng: Medusa trả 401.
    if (res.status === 401 || res.status === 403) {
      return { trangThai: "loi", thongBao: "auth.err_rp_token" };
    }
    console.error(`[dat-lai-mat-khau] backend trả ${res.status}`);
    return { trangThai: "loi", thongBao: "auth.err_reset_busy" };
  } catch {
    return { trangThai: "loi", thongBao: "auth.err_reset_busy" };
  }
}
