/** @type {import('tailwindcss').Config} */
//
// Hệ thiết kế "Hầm rượu & Đồng" — boutique rượu vang.
//
// Bốn màu thương hiệu (đặt tên theo vật liệu, không theo chức năng):
//
//   burgundy  #6B1E2E  màu rượu — nút chính, liên kết, điểm nhấn đậm
//   ivory     #F7F3EC  giấy — nền trang
//   charcoal  #1C1A19  mực — chữ, chân trang, thanh thông báo
//   copper    #B08D57  đồng — đường kẻ mảnh, ký hiệu, chữ lớn trên nền tối
//
// ⚠️ ĐỘ TƯƠNG PHẢN (đo bằng công thức WCAG 2.x, không ước lượng):
//   · copper trên ivory chỉ đạt 2,79:1 → CHỈ dùng cho đường kẻ, ký hiệu, viền.
//     Chữ đồng cỡ nhỏ trên nền sáng phải dùng `copper-ink` (5,18:1).
//   · copper trên charcoal đạt 5,61:1 → dùng làm chữ được trên nền tối.
//   · copper trên burgundy chỉ 3,67:1 → chỉ chữ ≥ 24px hoặc ký hiệu.
//
// Giữ nguyên các TÊN lớp cũ (`wine`, `ink`, `page`, `line`, `footer`, `sale`…)
// để hàng trăm dòng JSX ở giỏ hàng, thanh toán, tài khoản đổi màu theo mà không
// phải sửa: Tailwind bỏ qua lớp không tồn tại mà KHÔNG báo lỗi.
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: "#6B1E2E",
          dark: "#561725",
          darker: "#3F101B",
          light: "#8A3446",
          pale: "#F1E6E4",
        },
        menubar: {
          DEFAULT: "#1C1A19",
          dark: "#0F0E0D",
          text: "#F7F3EC",
        },
        copper: {
          DEFAULT: "#B08D57",
          ink: "#80612F",
          light: "#D2B988",
          pale: "#EFE4D0",
        },
        ink: {
          DEFAULT: "#1C1A19",
          strong: "#0F0E0D",
          muted: "#5C5650",
          soft: "#6B655D",
          faint: "#6B655D",
        },
        page: "#F7F3EC",
        cream: "#FBF8F2",
        stone: "#EFE8DB",
        line: "#E3DACB",
        // Viền của ô nhập / thẻ chọn: phải đạt ≥ 3:1 so với nền (WCAG 1.4.11). `line` ở trên
        // chỉ dành cho đường kẻ trang trí, KHÔNG dùng làm viền điều khiển.
        "line-strong": "#8A8178",
        footer: "#1C1A19",
        sale: "#6B1E2E",
        // Màu trạng thái (thanh toán thành công / chưa hoàn tất / lưu ý), chữ đậm
        // trên nền nhạt cùng tông đều đạt ≥ 4,5:1.
        ok: { DEFAULT: "#2F5535", bg: "#EDF3EC", line: "#BFD3BF", ink: "#254A2C" },
        bad: { DEFAULT: "#8C2F3F", bg: "#F8ECEC", line: "#E5C3C6" },
        warn: { DEFAULT: "#6B4A12", bg: "#FAF1DF" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        ten: ["var(--font-ten-sp)", "Noto Serif Display", "Georgia", "serif"],
        display: [
          "var(--font-display)",
          "Cormorant Garamond",
          "Georgia",
          "serif",
        ],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
      },
      letterSpacing: {
        caps: "0.18em",
        wide2: "0.08em",
      },
      maxWidth: {
        site: "1320px",
        prose2: "62ch",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 26, 25, 0.04)",
        "card-hover": "0 18px 40px -18px rgba(28, 26, 25, 0.28)",
        header: "0 1px 0 rgba(28, 26, 25, 0.06)",
        mega: "0 24px 48px -24px rgba(28, 26, 25, 0.35)",
      },
      transitionTimingFunction: {
        // Cong ease-out nhẹ — chuyển động "đặt xuống", không bật nảy.
        cellar: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      aspectRatio: {
        bottle: "3 / 4",
      },
    },
  },
  plugins: [],
}
