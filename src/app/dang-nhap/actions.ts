"use server";

import { redirect } from "next/navigation";
import { khoaLoi } from "@/lib/auth-loi";
import { dangNhap } from "@/lib/khach-hang";

export interface TrangThaiDangNhap {
  /** Thông báo lỗi tiếng Việt để hiện ngay trên form, rỗng nghĩa là chưa có lỗi. */
  loi: string;
  /** Giữ lại email khách vừa gõ để không bắt gõ lại sau khi báo lỗi. */
  email: string;
}


/**
 * Xử lý đăng nhập — SỬA BUG-R38 (kiểm thử 05/08/2026).
 *
 * Bản trước chuyển hướng về `/dang-nhap?loi=…` rồi đọc lại từ chuỗi truy vấn.
 * Trên thực tế khách nhập sai tài khoản chỉ thấy form được vẽ lại, KHÔNG có
 * thông báo nào — không biết mình gõ sai hay hệ thống đang hỏng.
 *
 * Nay lỗi được TRẢ THẲNG về form qua `useActionState`, không đi vòng qua URL
 * nên không phụ thuộc vào bộ đệm định tuyến của trình duyệt. Đăng nhập đúng thì
 * `redirect()` vẫn chạy như cũ.
 *
 * ⚠️ Thông điệp cố ý KHÔNG phân biệt "email không tồn tại" với "sai mật khẩu"
 * (xem `packages/khach-hang/loi.ts`) — nói rõ ra là chỉ điểm cho kẻ dò tài khoản.
 */
export async function xuLyDangNhap(
  _truoc: TrangThaiDangNhap,
  formData: FormData
): Promise<TrangThaiDangNhap> {
  const email = String(formData.get("email") || "").trim();
  const matKhau = String(formData.get("mat_khau") || "");
  const tiep = String(formData.get("tiep") || "/");

  if (!email || !matKhau) {
    return { loi: "auth.err_missing", email };
  }

  const kq = await dangNhap(email, matKhau);
  if (!kq.ok) {
    return { loi: khoaLoi(kq.loi), email };
  }

  // redirect() ném exception để dừng luồng — phải gọi NGOÀI mọi try/catch.
  redirect(tiep.startsWith("/") ? tiep : "/");
}
