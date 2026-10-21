import type { Locale } from "@/i18n/config";

/**
 * Nội dung biên tập CỐ ĐỊNH của trang Cẩm nang (`/blog`) — phần không đến từ
 * bài viết trong Medusa. Mỗi chuỗi có đủ các ngôn ngữ trong `LOCALES`; thiếu
 * bản dịch thì `<L>` tự rơi về tiếng Việt (xem components/T.tsx).
 */

type DaNgu = Partial<Record<Locale, string>> & { vi: string };

export interface MonAn {
  ten: DaNgu;
  goiY: DaNgu;
  /** Từ khoá đưa sang trang tìm kiếm để ra đúng những chai hợp món. */
  timKiem: string;
}

/** "Bữa tối nay ăn gì?" — món ăn → kiểu vang hợp nhất. */
export const PHOI_MON: MonAn[] = [
  {
    ten: { vi: "Bò nướng", en: "Grilled beef" },
    goiY: { vi: "Vang đỏ đậm, hậu vị ấm", en: "Full-bodied red, warm finish" },
    timKiem: "Shiraz",
  },
  {
    ten: { vi: "Hải sản", en: "Seafood" },
    goiY: { vi: "Vang trắng khô, tươi mát", en: "Dry white, crisp and fresh" },
    timKiem: "Sauvignon Blanc",
  },
  {
    ten: { vi: "Lẩu & món đậm vị", en: "Hotpot & bold flavours" },
    goiY: { vi: "Vang hồng hoặc vang sủi bọt", en: "Rosé or sparkling" },
    timKiem: "Rosé",
  },
  {
    ten: { vi: "Phô mai & tiệc nhẹ", en: "Cheese & light bites" },
    goiY: { vi: "Vang đỏ mềm, ít chát", en: "Soft, low-tannin red" },
    timKiem: "Pinot Noir",
  },
];

export interface ThuatNgu {
  nhom: DaNgu;
  tu: DaNgu;
  nghia: DaNgu;
}

/** "Thuật ngữ trong một phút". */
export const THUAT_NGU: ThuatNgu[] = [
  {
    nhom: { vi: "Vang đỏ", en: "Red wine" },
    tu: { vi: "Chát", en: "Tannic" },
    nghia: {
      vi: "Cảm giác se ở lưỡi và má. Chát vừa phải giúp vang hợp món thịt; quá nhiều có thể khiến người mới thấy khó uống.",
      en: "The drying feel on the tongue and cheeks. A moderate amount suits meat dishes; too much can feel harsh to newcomers.",
    },
  },
  {
    nhom: { vi: "Vị", en: "Taste" },
    tu: { vi: "Khô", en: "Dry" },
    nghia: {
      vi: "Vang ít đường dư, không ngọt. Phần lớn vang dùng cùng bữa chính là vang khô.",
      en: "Little residual sugar, not sweet. Most wines served with a main meal are dry.",
    },
  },
  {
    nhom: { vi: "Năm thu hoạch", en: "Harvest year" },
    tu: { vi: "Niên vụ", en: "Vintage" },
    nghia: {
      vi: "Cùng một chai nhưng khác năm có thể khác hương vị, vì thời tiết mỗi mùa mỗi khác.",
      en: "The same wine can taste different from one year to the next, because every season's weather is different.",
    },
  },
  {
    nhom: { vi: "Trước khi uống", en: "Before drinking" },
    tu: { vi: "Thở rượu", en: "Breathing" },
    nghia: {
      vi: "Mở chai hoặc rót ra bình để vang tiếp xúc không khí, hương vị mềm và rõ hơn.",
      en: "Open the bottle or decant it so the wine meets the air; the flavours soften and open up.",
    },
  },
];
