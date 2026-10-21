"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import T from "@/components/T";
import { xuLyQuenMatKhau } from "./actions";
import { TRANG_THAI_DAU } from "./trang-thai";

/** Form gửi yêu cầu khôi phục mật khẩu — SỬA BUG-R29. */
export default function FormQuenMatKhau() {
  const [trangThai, guiDi] = useActionState(xuLyQuenMatKhau, TRANG_THAI_DAU);

  return (
    <>
      {trangThai.trangThai === "ok" && (
        <div
          role="status"
          className="mb-4 rounded border border-line bg-wine-pale px-3 py-2.5 text-xs leading-relaxed text-ink"
        >
          <T k={trangThai.thongBao} />
        </div>
      )}

      {trangThai.trangThai === "loi" && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          <T k={trangThai.thongBao} />
        </div>
      )}

      <form action={guiDi} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-semibold text-ink-strong"
          >
            <T k="auth.fp_label" />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={trangThai.email}
            placeholder="name@example.com"
            className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
          />
        </div>

        <NutGui />
      </form>
    </>
  );
}

function NutGui() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-wine w-full disabled:opacity-70"
    >
      {pending ? <T k="auth.fp_btn_busy" /> : <T k="auth.fp_btn" />}
    </button>
  );
}
