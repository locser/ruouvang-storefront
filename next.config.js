/**
 * Cấu hình Next.js MẪU cho storefront mới.
 *
 * Chép sang `apps/storefront-<ten>/next.config.js` rồi sửa đúng một chỗ: danh
 * sách `remotePatterns` phải khai tên miền ảnh của shop đó.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Gom đúng những tệp thật sự cần để chạy vào `.next/standalone`, kèm bản
   * `node_modules` đã cắt tỉa.
   *
   * Nhờ đó ảnh Docker không phải mang theo toàn bộ mã nguồn kho chung và gói
   * phụ thuộc của tám ứng dụng anh em — thứ đã đẩy ảnh cũ lên 3,84 GB.
   *
   * Chỉ có tác dụng với `next build`; `next dev` bỏ qua tuỳ chọn này.
   */
  output: "standalone",

  /**
   * Nén phản hồi bằng gzip ngay tại Next.js.
   *
   * Trang danh mục trả ~150 KB HTML thô mỗi lượt. Bật nén cắt phần lớn lượng
   * dữ liệu đó — với khách dùng 3G/4G đây là phần cải thiện dễ cảm nhận nhất,
   * hơn cả mấy chục mili-giây tiết kiệm ở phía máy chủ.
   */
  compress: true,

  /** Ẩn tiêu đề `X-Powered-By: Next.js` — không cần khai với bên ngoài. */
  poweredByHeader: false,

  /**
   * Tắt biểu tượng dev của Next.js (chữ "N" ở góc) và dòng "building…".
   * Chỉ hiện khi chạy `next dev`; `next build` / `next start` không có.
   */
  devIndicators: false,

  /**
   * Bỏ bước ESLint khi `next build`. Cấu hình ESLint ở thư mục gốc `website/`
   * chưa nạp plugin react-hooks và @next/next nên mọi `eslint-disable` sẵn có
   * bị báo "rule not found" và chặn build. Kiểm tra kiểu vẫn chạy (`tsc`).
   */
  eslint: { ignoreDuringBuilds: true },

  images: {
    /**
     * Ảnh C.W. Wines được `scripts/chuan-bi-anh-cwwines.js` resize sẵn
     * thành WebP 200/400/800/1600px trong `public/anh`. Loader toàn cục tra
     * manifest và chọn bản nhỏ nhất không thấp hơn bề rộng yêu cầu.
     *
     * Vì tập WebP đã được chuẩn bị trước, mỗi request chỉ đọc tệp tĩnh
     * từ máy này; Next không resize theo request và trình duyệt không gọi
     * Shopify. URL Shopify trong dữ liệu chỉ còn là khoá tra manifest.
     */
    loader: "custom",
    loaderFile: "./src/lib/anh-cwwines.ts",
    unoptimized: false,
  },

  /**
   * ⚠️ BIẾN MEDUSA DƯỚI ĐÂY PHẢI CÓ MẶT LÚC `next build`, KHÔNG CHỈ LÚC CHẠY.
   *
   * Ở chế độ `next dev`, hàm `rewrites()` chạy lại mỗi lần khởi động nên biến
   * lúc chạy là đủ. Nhưng `next build` NƯỚNG CỨNG kết quả vào
   * `.next/routes-manifest.json` — thiếu biến lúc dựng thì giá trị dự phòng
   * URL dự phòng bị ghi vĩnh viễn và storefront có thể gọi nhầm dịch vụ.
   *
   * `scripts/dung-storefront.sh` đã truyền sẵn biến này và kiểm tra lại
   * routes-manifest sau khi dựng. Dựng bằng tay thì tự nhớ.
   */
  async rewrites() {
    const medusaBackend =
      process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000";
    return [
      {
        source: "/medusa-api/:path*",
        destination: `${medusaBackend}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
