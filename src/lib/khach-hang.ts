/**
 * Xác thực khách hàng — nối bản dùng chung `packages/khach-hang` vào Next.
 *
 * Toàn bộ quy tắc (luồng đăng ký 3 bước, dịch lỗi, nguồn sự thật cho câu hỏi
 * "đã đăng nhập chưa") nằm ở gói dùng chung và có kiểm thử. Tệp này CHỈ làm
 * một việc: nói cho gói đó biết cất token vào đâu.
 *
 * ⚠️ `httpOnly: true` là bắt buộc — JavaScript phía client không được đọc
 * token, đó là hàng rào chống đánh cắp phiên qua XSS.
 */

import "server-only";

import { cookies } from "next/headers";
import {
  TEN_COOKIE,
  taoPhien,
  type KetQua,
  type KhachHang,
  type KhoCookiePhien,
} from "@vph/khach-hang";
import type { DonTheoDoi } from "@/lib/theo-doi-don";
import {
  chuyenDanhSachDon,
  TRUONG_DON_CUA_KHACH,
  type DonMedusa,
} from "@/lib/don-cua-khach";

export type { KhachHang } from "@vph/khach-hang";
export { TEN_COOKIE } from "@vph/khach-hang";

async function layKhoCookie(): Promise<KhoCookiePhien> {
  const kho = await cookies();
  return {
    doc: (ten) => kho.get(ten)?.value,
    ghi: (ten, giaTri, hanGiay) =>
      kho.set(ten, giaTri, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: hanGiay,
      }),
    xoa: (ten) => kho.delete(ten),
  };
}

const phien = taoPhien(layKhoCookie);

export async function dangNhap(email: string, matKhau: string): Promise<KetQua> {
  return phien.dangNhap(email, matKhau);
}

export async function dangKy(
  email: string,
  matKhau: string,
  ho: string,
  ten: string
): Promise<KetQua> {
  return phien.dangKy(email, matKhau, ho, ten);
}

export const dangXuat = phien.dangXuat;

export async function layKhachHang(): Promise<KhachHang | null> {
  return phien.layKhachHang();
}

/**
 * Đơn hàng của khách đang đăng nhập (Medusa `GET /store/orders`, lọc theo token).
 * Lỗi mạng/API → trả mảng rỗng để trang tài khoản không hỏng; lỗi được ghi log.
 */
export async function layDonCuaKhach(): Promise<DonTheoDoi[]> {
  const token = (await layKhoCookie()).doc(TEN_COOKIE);
  const goc = process.env.CONFIG_API_MEDUSA_URL;
  const khoa = process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA;
  if (!token || !goc || !khoa) return [];

  try {
    const url = `${goc}/store/orders?limit=50&order=-created_at&fields=${encodeURIComponent(TRUONG_DON_CUA_KHACH)}`;
    const res = await fetch(url, {
      headers: { "x-publishable-api-key": khoa, Authorization: `Bearer ${token}` },
      // Đơn của khách phải luôn mới, không cache.
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[don-cua-khach] /store/orders trả ${res.status}`);
      return [];
    }
    const d = (await res.json()) as { orders?: DonMedusa[] };
    return chuyenDanhSachDon(d.orders ?? []);
  } catch (e) {
    console.error("[don-cua-khach] lỗi gọi /store/orders:", e);
    return [];
  }
}

export async function daDangNhap(): Promise<boolean> {
  return (await layKhachHang()) !== null;
}
