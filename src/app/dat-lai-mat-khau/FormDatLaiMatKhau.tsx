"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import T from "@/components/T";
import { xuLyDatLaiMatKhau } from "./actions";
import { TRANG_THAI_DAU } from "./trang-thai";

/** Form đặt mật khẩu mới. `token` lấy từ link trong email, gửi kèm bằng ô ẩn. */
export default function FormDatLaiMatKhau({ token }: { token: string }) {
  const [trangThai, guiDi] = useActionState(xuLyDatLaiMatKhau, TRANG_THAI_DAU);

  if (trangThai.trangThai === "ok") {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded border border-line bg-wine-pale px-3 py-2.5 text-xs leading-relaxed text-ink"
        >
          <T k={trangThai.thongBao} />
        </div>
        <Link href="/dang-nhap" className="btn-wine block w-full text-center">
          <T k="auth.rp_goto_login" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {trangThai.trangThai === "loi" && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          <T k={trangThai.thongBao} />
          {trangThai.thongBao === "auth.err_rp_token" && (
            <>
              {" "}
              <Link href="/quen-mat-khau" className="underline">
                <T k="auth.rp_ask_again" />
              </Link>
            </>
          )}
        </div>
      )}

      <form action={guiDi} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="matKhau" className="mb-1 block text-xs font-semibold text-ink-strong">
            <T k="auth.rp_pw" />
          </label>
          <input
            id="matKhau"
            name="matKhau"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
          />
          <p className="mt-1 text-[11px] text-ink-soft"><T k="auth.pw_hint" /></p>
        </div>

        <div>
          <label htmlFor="nhapLai" className="mb-1 block text-xs font-semibold text-ink-strong">
            <T k="auth.rp_pw2" />
          </label>
          <input
            id="nhapLai"
            name="nhapLai"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
    <button type="submit" disabled={pending} className="btn-wine w-full disabled:opacity-70">
      {pending ? <T k="auth.rp_btn_busy" /> : <T k="auth.rp_btn" />}
    </button>
  );
}
