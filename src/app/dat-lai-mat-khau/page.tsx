import type { Metadata } from "next";
import Link from "next/link";
import T from "@/components/T";
import FormDatLaiMatKhau from "./FormDatLaiMatKhau";

export const metadata: Metadata = {
  title: "Đặt mật khẩu mới — C.W. Wines",
  // Token nằm trên URL: không cho công cụ tìm kiếm lập chỉ mục, và không gửi Referer
  // sang trang khác để token không lọt vào log của bên thứ ba.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Trang đặt mật khẩu mới. Khách vào từ link trong email: `/dat-lai-mat-khau?token=…`.
 * Thiếu token thì hướng dẫn xin link mới; token sai/hết hạn được báo khi gửi form.
 */
export default async function TrangDatLaiMatKhau({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const coToken = typeof token === "string" && token.trim().length > 0;

  return (
    <div className="container-site py-12">
      <div className="mx-auto max-w-md">
        <div className="panel p-8">
          <h1 className="mb-1 text-xl font-bold text-wine"><T k="auth.rp_title" /></h1>

          {coToken ? (
            <>
              <p className="mb-6 text-xs leading-relaxed text-ink-muted"><T k="auth.rp_sub" /></p>
              <FormDatLaiMatKhau token={token!.trim()} />
            </>
          ) : (
            <div className="space-y-4">
              <p className="mt-2 text-xs leading-relaxed text-ink-muted"><T k="auth.rp_no_token" /></p>
              <Link href="/quen-mat-khau" className="btn-wine block w-full text-center">
                <T k="auth.rp_ask_again" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
