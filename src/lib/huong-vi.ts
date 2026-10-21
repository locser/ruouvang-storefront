/**
 * Nhãn sản phẩm ("Bán chạy / Dễ uống / Hợp làm quà") và mô tả hương vị dễ hiểu.
 *
 * Module thuần, không import gì của Next — dùng được ở cả Server lẫn Client Component.
 *
 * Nguyên tắc: KHÔNG bịa. Mỗi nhãn đều có căn cứ kiểm được:
 *   · "Bán chạy"    — chỉ khi shop tự đánh dấu (tag 'Best Seller'/'Bán chạy' trên
 *                     sản phẩm, hoặc handle nằm trong `nhan-san-pham.json`). Site
 *                     chưa có số liệu bán hàng nên không tự suy ra được.
 *   · "Dễ uống"     — theo phong cách giống nho/loại rượu (ít chát, ít gắt).
 *   · "Hợp làm quà" — rượu sủi/Champagne/Port, hoặc giá từ 1.500.000đ, hoặc tag 'Gift'.
 * Mô tả hương vị là đặc trưng CHUNG của giống nho/loại rượu, không phải ghi chú
 * nếm của từng chai; giao diện chi tiết có ghi rõ điều này.
 */
import cauHinh from "./nhan-san-pham.json";

export type MaNhan = "ban-chay" | "de-uong" | "hop-lam-qua";

/** Khoá i18n của từng nhãn — văn bản nằm trong `i18n/messages/*.json`. */
export const KHOA_NHAN: Record<MaNhan, string> = {
  "ban-chay": "badge.best_seller",
  "de-uong": "badge.easy_drinking",
  "hop-lam-qua": "badge.gift_worthy",
};

export interface DauVaoNhan {
  title: string;
  handle?: string;
  /** Loại rượu của shop: "Red Wine", "Sparkling"… */
  loai?: string;
  tags?: string[];
  giaVnd: number;
}

interface PhongCach {
  khoa: string;
  khop: RegExp;
  deUong: boolean;
  quaTang: boolean;
}

/**
 * Thứ tự quan trọng: mẫu cụ thể ("sauvignon blanc", "pinot noir") phải đứng
 * trước mẫu chung ("sauvignon", "pinot") để không khớp nhầm Cabernet Sauvignon
 * vào Sauvignon Blanc.
 */
const PHONG_CACH: PhongCach[] = [
  {
    khoa: "sparkling",
    khop: /champagne|prosecco|sparkling|brut|cava|frose|spumante/i,
    deUong: true,
    quaTang: true,
  },
  {
    khoa: "rose",
    khop: /\bros(?:e|é|�)(?![a-z])/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "port",
    khop: /tawny|fortified|muscat|\bruby port|\bvintage port/i,
    deUong: false,
    quaTang: true,
  },
  {
    khoa: "sauvignon-blanc",
    khop: /sauvignon\s+blanc|semillon\s+sauvignon/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "riesling",
    khop: /riesling/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "pinot-gris",
    khop: /pinot\s+gri[sg]/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "chardonnay",
    khop: /chardonnay/i,
    deUong: false,
    quaTang: false,
  },
  {
    khoa: "pinot-noir",
    khop: /pinot\s+noir/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "cabernet",
    khop: /cabernet|\bcab\b/i,
    deUong: false,
    quaTang: false,
  },
  {
    khoa: "merlot",
    khop: /merlot/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "grenache",
    khop: /grenache|\bgsm\b/i,
    deUong: true,
    quaTang: false,
  },
  {
    khoa: "shiraz",
    khop: /shiraz|syrah/i,
    deUong: false,
    quaTang: false,
  },
  {
    khoa: "do",
    khop: /red\s*wine|vang\s*đỏ/i,
    deUong: false,
    quaTang: false,
  },
  {
    khoa: "trang",
    khop: /white\s*wine|vang\s*trắng/i,
    deUong: true,
    quaTang: false,
  },
];

const LA_THUNG = /\b(pack|case|dozen|carton)\b/i;
const NGUONG_QUA_VND = 1_500_000;

function chuoiTim(d: DauVaoNhan): string {
  return [d.title, d.loai ?? "", ...(d.tags ?? [])].join(" | ");
}

export function timPhongCach(d: DauVaoNhan): PhongCach | null {
  const co = chuoiTim(d);
  return PHONG_CACH.find((p) => p.khop.test(co)) ?? null;
}

/**
 * Khoá i18n (`taste.shiraz`…) của mô tả hương vị theo giống nho/loại rượu;
 * `null` nếu không nhận ra được. Văn bản ở `i18n/messages/*.json`.
 */
export function layHuongVi(d: DauVaoNhan): string | null {
  if (LA_THUNG.test(d.title)) return null;
  const p = timPhongCach(d);
  return p ? `taste.${p.khoa}` : null;
}

/**
 * Khoá i18n (`pair.shiraz`…) danh sách món hợp với chai này — các mục cách nhau bằng "|". Cùng cách
 * nhận phong cách như `layHuongVi`: đặc trưng CHUNG của giống nho/loại rượu, không phải khuyến nghị
 * riêng cho từng chai. `null` nếu không nhận ra.
 */
export function layMonAn(d: DauVaoNhan): string | null {
  if (LA_THUNG.test(d.title)) return null;
  const p = timPhongCach(d);
  return p ? `pair.${p.khoa}` : null;
}

const TAG_BAN_CHAY = /best\s*-?seller|bán\s*chạy|ban\s*chay/i;
const TAG_QUA = /gift|quà\s*tặng|qua\s*tang/i;
const TAG_DE_UONG = /easy\s*drink|dễ\s*uống|de\s*uong/i;

const HANDLE_BAN_CHAY = new Set<string>(cauHinh.banChay);

/** Tối đa 2 nhãn trên một thẻ: thứ tự ưu tiên Bán chạy → Dễ uống → Hợp làm quà. */
export function layNhan(d: DauVaoNhan, toiDa = 2): MaNhan[] {
  const tags = (d.tags ?? []).join(" | ");
  const p = LA_THUNG.test(d.title) ? null : timPhongCach(d);
  const ra: MaNhan[] = [];

  if (TAG_BAN_CHAY.test(tags) || (d.handle && HANDLE_BAN_CHAY.has(d.handle))) {
    ra.push("ban-chay");
  }
  if (TAG_DE_UONG.test(tags) || p?.deUong) ra.push("de-uong");
  if (
    TAG_QUA.test(tags) ||
    (!LA_THUNG.test(d.title) && (p?.quaTang || d.giaVnd >= NGUONG_QUA_VND))
  ) {
    ra.push("hop-lam-qua");
  }
  return ra.slice(0, toiDa);
}
