"use client";

import Link from "next/link";
import T from "@/components/T";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { xuLyDangNhap } from "./actions";
import { TRANG_THAI_DAU } from "./trang-thai";

/**
 * Form đăng nhập — SỬA BUG-R38.
 *
 * Lỗi hiển thị ngay tại chỗ nhờ `useActionState`, thay vì đi vòng qua
 * `?loi=…` trên URL như bản trước (khách nhập sai không thấy thông báo nào).
 * Vùng thông báo có `role="alert"` để trình đọc màn hình đọc lên.
 */
export default function FormDangNhap({
  tiep,
}: {
  tiep: string;
}) {
  const [trangThai, guiDi] = useActionState(xuLyDangNhap, TRANG_THAI_DAU);

  return (
    <>
      {trangThai.loi && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          <T k={trangThai.loi} />
        </div>
      )}

      <form action={guiDi} className="space-y-4">
        <input type="hidden" name="tiep" value={tiep} />

        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold text-ink-strong">
            <T k="auth.label_email" />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={trangThai.email || ""}
            placeholder="name@example.com"
            className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
          />
        </div>

        <div>
          <label htmlFor="mat_khau" className="mb-1 block text-xs font-semibold text-ink-strong">
            <T k="auth.label_password" />
          </label>
          <input
            id="mat_khau"
            name="mat_khau"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
          />
        </div>

        <NutGui />
      </form>

      {/* SỬA BUG-R29: trước đây trang đăng nhập không có lối khôi phục mật khẩu. */}
      <p className="mt-3 text-right text-xs">
        <Link href="/quen-mat-khau" className="font-semibold text-wine hover:underline">
          <T k="auth.forgot" />
        </Link>
      </p>
    </>
  );
}

/** Nút gửi tự khoá khi đang xử lý, tránh khách bấm hai lần. */
function NutGui() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-wine w-full disabled:opacity-70">
      {pending ? <T k="auth.btn_login_busy" /> : <T k="auth.btn_login" />}
    </button>
  );
}
