import Link from "next/link";
import { redirect } from "next/navigation";
import T from "@/components/T";
import { dangKy, daDangNhap } from "@/lib/khach-hang";
import { khoaLoi, laKhoaLoi } from "@/lib/auth-loi";

export const metadata = {
  title: "Đăng Ký Thành Viên — C.W. Wines",
  description: "Tạo tài khoản C.W. Wines để tích điểm, theo dõi đơn hàng và nhận ưu đãi riêng.",
};

export default async function TrangDangKy({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  const sp = await searchParams;

  if (await daDangNhap()) redirect("/");

  async function xuLy(formData: FormData) {
    "use server";

    const ho = String(formData.get("ho") || "");
    const ten = String(formData.get("ten") || "");
    const email = String(formData.get("email") || "");
    const matKhau = String(formData.get("mat_khau") || "");
    const nhacLai = String(formData.get("nhac_lai") || "");

    if (matKhau !== nhacLai) {
      redirect(`/dang-ky?loi=${encodeURIComponent("auth.err_mismatch")}`);
    }

    const kq = await dangKy(email, matKhau, ho, ten);

    if (!kq.ok) {
      redirect(`/dang-ky?loi=${encodeURIComponent(khoaLoi(kq.loi))}`);
    }
    redirect("/");
  }

  return (
    <div className="container-site py-12">
      <div className="mx-auto max-w-md">
        <div className="panel p-8">
          <h1 className="mb-1 text-xl font-bold text-wine"><T k="auth.reg_title" /></h1>
          <p className="mb-6 text-xs text-ink-muted"><T k="auth.reg_sub" /></p>

          {laKhoaLoi(sp.loi) && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              <T k={sp.loi} />
            </div>
          )}

          <form action={xuLy} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ho" className="mb-1 block text-xs font-semibold text-ink-strong">
                  <T k="auth.reg_last" />
                </label>
                <input
                  id="ho"
                  name="ho"
                  required
                  autoComplete="given-name"
                  className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
                />
              </div>
              <div>
                <label htmlFor="ten" className="mb-1 block text-xs font-semibold text-ink-strong">
                  <T k="auth.reg_first" />
                </label>
                <input
                  id="ten"
                  name="ten"
                  required
                  autoComplete="family-name"
                  className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
                />
              </div>
            </div>

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
                placeholder="name@example.com"
                className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
              />
            </div>

            <div>
              <label htmlFor="mat_khau" className="mb-1 block text-xs font-semibold text-ink-strong">
                <T k="auth.label_password" /> <span className="font-normal text-ink-muted">· <T k="auth.pw_hint" /></span>
              </label>
              <input
                id="mat_khau"
                name="mat_khau"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
              />
            </div>

            <div>
              <label htmlFor="nhac_lai" className="mb-1 block text-xs font-semibold text-ink-strong">
                <T k="auth.reg_pw_again" />
              </label>
              <input
                id="nhac_lai"
                name="nhac_lai"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded border border-line px-3 py-2.5 text-[13px] outline-none focus:border-wine"
              />
            </div>

            <button type="submit" className="btn-wine w-full">
              <T k="auth.reg_btn" />
            </button>
          </form>

          <p className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-muted">
            <T k="auth.have_account" />{" "}
            <Link href="/dang-nhap" className="font-semibold text-wine hover:underline">
              <T k="auth.btn_login" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
