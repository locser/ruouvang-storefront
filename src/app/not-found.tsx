import type { Metadata } from "next";
import Link from "next/link";
import T, { TL } from "@/components/T";
import { HE_THONG_CUA_HANG, MENU, duongDanDanhMuc } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Không tìm thấy trang — C.W. Wines",
  description:
    "Đường dẫn không tồn tại hoặc sản phẩm đã ngừng kinh doanh. Mời quý khách quay về trang chủ C.W. Wines.",
  robots: { index: false, follow: true },
};

/**
 * Trang 404 — SỬA BUG-R10 (kiểm thử 05/08/2026).
 *
 * Trước đây ứng dụng KHÔNG có tệp `not-found.tsx` nào, nên:
 *
 *   · `/san-pham/<slug-không-có-thật>` rơi vào trang 404 mặc định của Next.js,
 *     hiện dòng tiếng Anh "404: This page could not be found." trên một website
 *     hoàn toàn tiếng Việt;
 *   · các đường dẫn khác thì dùng thẻ title của trang chủ và phần thân
 *     trống trơn — khách chỉ thấy header với footer, không biết chuyện gì xảy ra
 *     và không có lối nào quay lại.
 *
 * Next.js tự dùng tệp này cho cả hai trường hợp: route không khớp và mọi lời gọi
 * `notFound()` trong ứng dụng.
 */
export default function KhongTimThay() {
  // Lấy vài ngành hàng chính từ mega menu để khách đi tiếp được ngay.
  const goiY = MENU.slice(0, 6);

  return (
    <div className="container-site py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="font-display text-[64px] leading-none text-wine md:text-[88px]">
          404
        </div>

        <h1 className="mt-3 font-display text-[26px] leading-tight text-ink md:text-[32px]">
          <T k="not_found.we_couldn_t_find_that" />
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-ink-muted">
          <T k="not_found.the_link_may_have_changed" />
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="btn-wine no-underline">
            <T k="not_found.back_to_home" />
          </Link>
          <Link href="/danh-muc" className="btn-wine-outline no-underline">
            <T k="not_found.all_categories" />
          </Link>
        </div>

        {goiY.length > 0 && (
          <div className="mt-10 border-t border-line pt-8">
            <h2 className="section-title mb-4">
              <T k="not_found.main_categories" />
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {goiY.map((m) => (
                <Link
                  key={m.handle}
                  href={duongDanDanhMuc(m.handle)}
                  className="rounded-full border border-line px-4 py-1.5 text-2xs font-semibold text-ink transition-colors hover:bg-wine hover:text-white"
                >
                  <TL obj={m} field="ten" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-[13px] text-ink-muted">
          <T k="not_found.need_help_choosing_call" />{" "}
          <a
            href={`tel:${HE_THONG_CUA_HANG.hotline.replace(/\s/g, "")}`}
            className="font-bold text-wine"
          >
            {HE_THONG_CUA_HANG.hotline}
          </a>
        </p>
      </div>
    </div>
  );
}
