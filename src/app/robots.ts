import type { MetadataRoute } from "next";

/**
 * robots.txt — khai báo sitemap và chặn các trang riêng tư.
 *
 * Liên quan BUG-R34: `/sitemap.xml` trước đây trả về 404 nên dù robots.txt có
 * đáp 200 thì bộ máy tìm kiếm cũng không có bản đồ nào để đi theo. Nay sitemap
 * đã có (`src/app/sitemap.ts`) và được khai báo ở đây.
 *
 * Các đường dẫn bị chặn đều là trang riêng của từng khách (giỏ hàng, đặt hàng,
 * xác nhận đơn, tài khoản, đăng nhập) — lập chỉ mục vừa vô ích vừa rủi ro.
 */
// Đọc CONFIG_SITE_URL lúc chạy, không dựng tĩnh lúc build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const GOC = process.env.CONFIG_SITE_URL || "http://localhost:8900";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/gio-hang",
          "/thanh-toan",
          "/dat-hang-thanh-cong",
          "/tai-khoan",
          "/dang-nhap",
          "/dang-ky",
          "/quen-mat-khau",
          "/api/",
        ],
      },
    ],
    sitemap: `${GOC}/sitemap.xml`,
    host: GOC,
  };
}
