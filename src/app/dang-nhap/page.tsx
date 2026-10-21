import Link from "next/link";
import T from "@/components/T";
import { redirect } from "next/navigation";
import FormDangNhap from "./FormDangNhap";
import { daDangNhap } from "@/lib/khach-hang";

export const metadata = {
  title: "Đăng nhập tài khoản — C.W. Wines",
  description:
    "Đăng nhập tài khoản C.W. Wines để theo dõi đơn hàng rượu vang và nhận ưu đãi thành viên.",
};

/**
 * Trang đăng nhập.
 *
 * Lỗi đã chữa (báo cáo kiểm thử 05/08/2026):
 *
 *   · BUG-R04 — dòng mô tả mời khách "đặt lịch C.W. WINES CLINIC & SPA", một dịch
 *     vụ không hề tồn tại; đó là câu chữ của website mỹ phẩm Hasaki.
 *   · BUG-R38 — đăng nhập sai không hiện thông báo nào (xem `actions.ts`).
 *   · BUG-R29 — không có lối "Quên mật khẩu" (xem `FormDangNhap.tsx`).
 *   · BUG-R03 — hai link chính sách ở cuối trang trỏ tới slug không tồn tại.
 */
export default async function TrangDangNhap({
  searchParams,
}: {
  searchParams: Promise<{ tiep?: string }>;
}) {
  const sp = await searchParams;

  // Đã đăng nhập rồi thì không ở lại trang này.
  if (await daDangNhap()) redirect("/");

  const tiep = sp.tiep && sp.tiep.startsWith("/") ? sp.tiep : "/";

  return (
    <div className="container-site py-12">
      <div className="mx-auto max-w-md">
        <div className="panel p-8">
          <h1 className="mb-1 text-xl font-bold text-wine"><T k="auth.login_title" /></h1>
          <p className="mb-6 text-xs text-ink-muted"><T k="auth.login_sub" /></p>

          <FormDangNhap tiep={tiep} />

          <p className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-muted">
            <T k="auth.no_account" />{" "}
            <Link href="/dang-ky" className="font-semibold text-wine hover:underline">
              <T k="auth.register_now" />
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-2xs text-ink-muted">
          <T k="auth.agree_pre" />{" "}
          <Link
            href="/chinh-sach/dieu-khoan-va-dieu-kien"
            className="text-wine hover:underline"
          >
            <T k="auth.terms" />
          </Link>{" "}
          <T k="auth.agree_and" />{" "}
          <Link
            href="/chinh-sach/chinh-sach-bao-mat"
            className="text-wine hover:underline"
          >
            <T k="auth.privacy" />
          </Link>{" "}
          <T k="auth.agree_post" />
        </p>
      </div>
    </div>
  );
}
