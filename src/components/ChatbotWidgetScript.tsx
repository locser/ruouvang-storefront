import Script from "next/script";
import { THUONG_HIEU } from "@/lib/theme";

/**
 * Nạp widget chat của ChatBotAISAAS.
 *
 * ⚠️ Tên thuộc tính phải đúng y như widget đọc, xem `widget.js`:
 *   - `data-key`    (KHÔNG phải `data-api-key` — sai tên thì widget in
 *                    "[VPHChatbot] Missing X-Chatbot-Key" rồi thoát, bong bóng
 *                    chat không bao giờ hiện ra)
 *   - `data-server` (thiếu thì widget mặc định gọi về chính origin của trang,
 *                    tức https://hasaki.polarisvn.holdings — nơi không có API
 *                    chat. Trỏ vào "/chatbot-widget" để đi qua route proxy có
 *                    suy giảm êm của chính storefront.)
 *   - `data-ten-shop` (SỬA BUG-R31, kiểm thử 05/08/2026: trợ lý xưng chung
 *                    chung "Trợ lý ảo của cửa hàng", không nêu tên C.W. Wines.
 *                    Widget dùng chung cho mọi tenant nên tên PHẢI đi từ trang
 *                    nhúng vào, không được gán cứng trong `widget.js`.)
 */
export default function ChatbotWidgetScript({ khoa }: { khoa?: string }) {

  // Không có khoá thì đừng nạp — nạp cũng chỉ để widget báo lỗi ra console.
  if (!khoa) return null;

  return (
    <Script
      id="chatbot-widget-script"
      src="/chatbot-widget/widget.js"
      data-key={khoa}
      data-server="/chatbot-widget"
      data-ten-shop={THUONG_HIEU.ten}
      strategy="afterInteractive"
    />
  );
}
