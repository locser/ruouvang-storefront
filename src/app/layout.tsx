import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Serif_Display } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChanTuoi from "@/components/ChanTuoi";
import KhungTrang from "@/components/KhungTrang";
import ChatbotWidgetScript from "@/components/ChatbotWidgetScript";
import DockLienHe from "@/components/DockLienHe";
import { CaiDatProvider } from "@/lib/cai-dat-context";
import { layCaiDat } from "@/lib/lay-cai-dat";
import { GioHangProvider } from "@/lib/gio-hang-context";
import { DEFAULT_LOCALE, KHOA_LUU_NGON_NGU, LOCALES } from "@/i18n/config";
import { HE_THONG_CUA_HANG, THUONG_HIEU } from "@/lib/theme";
import "./globals.css";

// Inter làm font thân (giá, nút, thông số cần đọc nhanh). Subset `vietnamese` là
// bắt buộc — thiếu nó thì dấu tiếng Việt rơi về font hệ thống và chữ nhảy nét.
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  display: "swap",
});

// Cormorant Garamond cho tiêu đề: nét tương phản cao, hợp cỡ chữ lớn. Chỉ nạp
// ba độ đậm và một kiểu nghiêng (dùng làm điểm nhấn trong tiêu đề) để giữ trang nhẹ.
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

// Tên sản phẩm (có năm sản xuất như "Shiraz 2024"): Cormorant dùng chữ số kiểu cổ,
// số chìm xuống dưới đường cơ sở. Noto Serif Display vẫn sang trọng nhưng số thẳng hàng.
const tenSanPham = Noto_Serif_Display({
  weight: ["400", "500"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-ten-sp",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#F7F3EC",
  colorScheme: "light",
};

/**
 * Địa chỉ công khai của site — cần cho thẻ canonical, Open Graph và sitemap.
 * Đặt qua biến môi trường để bản chạy thử và bản thật không dùng chung địa chỉ.
 */
const diaChiSite = () => process.env.CONFIG_SITE_URL || "http://localhost:8900";

// Đọc CONFIG_SITE_URL và cấu hình chatbot lúc chạy: không dựng tĩnh lúc build, kẻo nướng giá trị rỗng.
export const dynamic = "force-dynamic";

/**
 * Thẻ meta gốc.
 *
 * Lỗi đã chữa (báo cáo kiểm thử 05/08/2026):
 *
 *   · BUG-R09 — thẻ title trang chủ là "C.W. Wines | Vietnam Premium Fine Wines &
 *     Spirits Shop", hoàn toàn tiếng Anh trên một website tiếng Việt, và bị hai
 *     trang khác dùng lại vì các trang đó không tự khai title. `title.template`
 *     bảo đảm mỗi trang con có title riêng, tự nối hậu tố thương hiệu.
 *   · BUG-R34 — thiếu favicon, thẻ Open Graph và thẻ canonical, nên chia sẻ
 *     đường dẫn một chai rượu lên Facebook hay Zalo không ra ảnh và tiêu đề.
 */
export function generateMetadata(): Metadata {
  const DIA_CHI_SITE = diaChiSite();
  return {
    metadataBase: new URL(DIA_CHI_SITE),
    title: {
      default: THUONG_HIEU.tieuDe,
      template: `%s — ${THUONG_HIEU.ten}`,
    },
    description: THUONG_HIEU.moTa,
    applicationName: THUONG_HIEU.tenDayDu,
    alternates: { canonical: "/" },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: DIA_CHI_SITE,
      siteName: THUONG_HIEU.tenDayDu,
      title: THUONG_HIEU.tieuDe,
      description: THUONG_HIEU.moTa,
      images: [{ url: THUONG_HIEU.logo, alt: THUONG_HIEU.tenDayDu }],
    },
    twitter: {
      card: "summary_large_image",
      title: THUONG_HIEU.tieuDe,
      description: THUONG_HIEU.moTa,
      images: [THUONG_HIEU.logo],
    },
    other: {
      // Cảnh báo ngành hàng có cồn — chuẩn `RTA` mà bộ lọc nội dung gia đình đọc.
      rating: "adult",
    },
  };
}

/**
 * Dữ liệu có cấu trúc cấp site — SỬA BUG-R34 (trang chủ có 0 khối JSON-LD).
 *
 * `Store` cho Google biết đây là cửa hàng bán lẻ có hotline và chuỗi chi nhánh;
 * `WebSite` kèm `SearchAction` cho phép hiện ô tìm kiếm ngay trong kết quả tra
 * cứu. Dữ liệu lấy từ `cwwines-theme.json` và `cwwines-stores.json`, không
 * ghi tay con số nào.
 */
function duLieuCoCauTruc() {
  const DIA_CHI_SITE = diaChiSite();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${DIA_CHI_SITE}/#cua-hang`,
        name: THUONG_HIEU.tenDayDu,
        url: DIA_CHI_SITE,
        logo: THUONG_HIEU.logo,
        image: THUONG_HIEU.logo,
        description: THUONG_HIEU.moTa,
        telephone: HE_THONG_CUA_HANG.hotline,
        email: HE_THONG_CUA_HANG.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Thành phố Hồ Chí Minh",
          addressCountry: "VN",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${DIA_CHI_SITE}/#website`,
        url: DIA_CHI_SITE,
        name: THUONG_HIEU.tenDayDu,
        inLanguage: "vi-VN",
        publisher: { "@id": `${DIA_CHI_SITE}/#cua-hang` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${DIA_CHI_SITE}/tim-kiem?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * CSS ẩn mọi ngôn ngữ không được chọn — sinh từ `LOCALES` để thêm ngôn ngữ mới
 * không phải sửa CSS. Xem components/T.tsx.
 */
const CSS_NGON_NGU = LOCALES.map(
  (l) => `html[lang="${l}"] [data-l]:not([data-l="${l}"]){display:none}`,
).join("");

/**
 * Áp ngôn ngữ đã lưu TRƯỚC khi trình duyệt vẽ lần đầu. Không có đoạn này, khách
 * đã chọn EN vẫn thấy tiếng Việt nháy lên một nhịp cho tới khi React hydrate.
 */
const SCRIPT_NGON_NGU = `try{var l=localStorage.getItem(${JSON.stringify(KHOA_LUU_NGON_NGU)});if(${JSON.stringify(LOCALES)}.indexOf(l)>-1)document.documentElement.lang=l}catch(e){}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caiDat = await layCaiDat();
  // `lang` mặc định là ngôn ngữ gốc; script trong <head> và component DoiNgonNgu
  // đổi thuộc tính này ngay trên trình duyệt, và CSS (CSS_NGON_NGU) ẩn/hiện phần
  // tương ứng.
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${inter.variable} ${cormorant.variable} ${tenSanPham.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS_NGON_NGU }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_NGON_NGU }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(duLieuCoCauTruc()),
          }}
        />
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-wine focus:px-5 focus:py-3 focus:text-[12px] focus:uppercase focus:tracking-[0.16em] focus:text-page"
        >
          Bỏ qua tới nội dung
        </a>
        <CaiDatProvider caiDat={caiDat}>
          <GioHangProvider>
            <KhungTrang dau={<Header />} chan={<Footer />}>
              {children}
            </KhungTrang>
          </GioHangProvider>
          <ChanTuoi />
          <DockLienHe />
        </CaiDatProvider>
        <ChatbotWidgetScript khoa={caiDat.widget_key} />
      </body>
    </html>
  );
}
