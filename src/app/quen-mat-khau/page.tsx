import Link from "next/link";
import T from "@/components/T";
import FormQuenMatKhau from "./FormQuenMatKhau";
import { HE_THONG_CUA_HANG } from "@/lib/theme";

export const metadata = {
  title: "Quên mật khẩu — C.W. Wines",
  description:
    "Khôi phục mật khẩu tài khoản C.W. Wines bằng email đã đăng ký, hoặc gọi tổng đài để được hỗ trợ.",
};

/**
 * Trang khôi phục mật khẩu — SỬA BUG-R29.
 *
 * Trước đây đường dẫn này trả về HTTP 404 và trang đăng nhập cũng không có link
 * nào dẫn tới, nên khách quên mật khẩu bị kẹt hoàn toàn.
 */
export default function TrangQuenMatKhau() {
  return (
    <div className="container-site py-12">
      <div className="mx-auto max-w-md">
        <div className="panel p-8">
          <h1 className="mb-1 text-xl font-bold text-wine"><T k="auth.fp_title" /></h1>
          <p className="mb-6 text-xs leading-relaxed text-ink-muted"><T k="auth.fp_sub" /></p>

          <FormQuenMatKhau />

          <p className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-muted">
            <T k="auth.fp_back_pre" />{" "}
            <Link href="/dang-nhap" className="font-semibold text-wine hover:underline">
              <T k="auth.fp_back" />
            </Link>
          </p>
        </div>

        <div className="panel mt-4 p-5 text-center">
          <p className="m-0 text-xs text-ink-muted"><T k="auth.fp_help" /></p>
          <a
            href={`tel:${HE_THONG_CUA_HANG.hotline.replace(/\s/g, "")}`}
            className="mt-1 block text-[20px] font-bold text-wine"
          >
            {HE_THONG_CUA_HANG.hotline}
          </a>
          <a
            href={`mailto:${HE_THONG_CUA_HANG.email}`}
            className="text-xs text-ink-muted transition-colors hover:text-wine"
          >
            {HE_THONG_CUA_HANG.email}
          </a>
        </div>
      </div>
    </div>
  );
}
