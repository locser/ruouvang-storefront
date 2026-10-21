"use server";

import { headers } from "next/headers";
import { taoBoGioiHan } from "@/lib/dat-lai-mat-khau";

/**
 * Yêu cầu khôi phục mật khẩu.
 *
 * Luồng của Medusa v2:
 *   POST /auth/customer/emailpass/reset-password  { identifier: <email> }
 *     → sinh token khôi phục và phát sự kiện `auth.password_reset`
 *   Backend (`subscribers/password-reset.ts`) bắt sự kiện đó và gửi email có link
 *   `/dat-lai-mat-khau?token=…`; khách đặt mật khẩu mới ở trang đó.
 *
 * Form công khai gửi email tới một địa chỉ bất kỳ nên có giới hạn tần suất theo cả
 * email lẫn IP, để không bị lợi dụng làm phiền hộp thư người khác.
 */

export interface TrangThaiQuenMatKhau {
  /** "" · "ok" · "loi" — quyết định khối thông báo nào được hiện. */
  trangThai: "" | "ok" | "loi";
  /** Khoá dịch (auth.*), hiển thị bằng <T>. */
  thongBao: string;
  email: string;
}

const TOI_DA_MOI_GIO = 3;
const MOT_GIO_MS = 60 * 60 * 1000;
const vuotGioiHanEmail = taoBoGioiHan(TOI_DA_MOI_GIO, MOT_GIO_MS);
const vuotGioiHanIp = taoBoGioiHan(TOI_DA_MOI_GIO * 3, MOT_GIO_MS);

export async function xuLyQuenMatKhau(
  _truoc: TrangThaiQuenMatKhau,
  formData: FormData
): Promise<TrangThaiQuenMatKhau> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      trangThai: "loi",
      thongBao: "auth.err_email",
      email,
    };
  }

  let ip = "khong-ro";
  try {
    ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || ip;
  } catch {
    /* ngoài phạm vi yêu cầu (ví dụ chạy test): chỉ còn giới hạn theo email */
  }
  if (vuotGioiHanEmail(`email:${email}`) || vuotGioiHanIp(`ip:${ip}`)) {
    return { trangThai: "loi", thongBao: "auth.err_reset_limit", email };
  }

  const goc = process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000";

  try {
    await fetch(`${goc}/auth/customer/emailpass/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email }),
      cache: "no-store",
    });
  } catch {
    return {
      trangThai: "loi",
      thongBao: "auth.err_reset_busy",
      email,
    };
  }

  // ⚠️ KHÔNG tiết lộ email có tồn tại trong hệ thống hay không — cùng nguyên tắc
  // với thông điệp đăng nhập ở `packages/khach-hang/loi.ts`.
  return {
    trangThai: "ok",
    thongBao: "auth.reset_ok",
    email,
  };
}
