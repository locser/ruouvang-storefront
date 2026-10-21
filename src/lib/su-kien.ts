/**
 * Sự kiện & ưu đãi — DỮ LIỆU DEMO để duyệt bố cục.
 *
 * ⚠️ Mọi con số, thời hạn và quà tặng dưới đây là NỘI DUNG MINH HOẠ, chưa phải
 * chương trình thật của shop. `HIEN_NHAN_DEMO = true` làm mỗi thẻ có dải "Demo" để
 * không ai nhầm; khi có chương trình thật thì thay dữ liệu và đặt cờ này về `false`.
 *
 * Về sau nên đọc từ Medusa (khuyến mãi / bộ sưu tập) thay vì file tĩnh; cấu trúc
 * trường được giữ gần với những gì Medusa có thể trả (tiêu đề, mô tả, thời hạn, liên kết).
 *
 * Văn bản theo quy ước hậu tố ngôn ngữ (`tieuDe`/`tieuDeEn`/…): thêm ngôn ngữ mới chỉ
 * cần thêm hậu tố, thiếu thì dùng tiếng Việt.
 */

export const HIEN_NHAN_DEMO = false;

export type LoaiSuKien = "giam-gia" | "qua-tang" | "combo";
export type TrangThaiSuKien = "dang-dien-ra" | "sap-dien-ra";

export interface SuKien {
  id: string;
  loai: LoaiSuKien;
  trangThai: TrangThaiSuKien;
  /** Sự kiện lớn nhất, hiện thành khối nổi bật đầu trang. */
  noiBat?: boolean;
  href: string;
  tieuDe: string;
  tieuDeEn: string;
  /** Câu ưu đãi ngắn, nhấn mạnh (vd "Giảm đến 20%"). */
  uuDai: string;
  uuDaiEn: string;
  moTa: string;
  moTaEn: string;
  dieuKien: string;
  dieuKienEn: string;
  thoiGian: string;
  thoiGianEn: string;
  [truong: string]: unknown;
}

export const SU_KIEN: SuKien[] = [
  {
    id: "black-friday",
    loai: "giam-gia",
    trangThai: "dang-dien-ra",
    noiBat: true,
    href: "/danh-muc/all-discount-blackfriday",
    tieuDe: "Black Friday",
    tieuDeEn: "Black Friday",
    uuDai: "Giảm đến 20%",
    uuDaiEn: "Up to 20% off",
    moTa: "Hàng trăm chai vang Úc giảm giá trong suốt tuần lễ Black Friday — dịp tốt nhất trong năm để nhập thêm rượu cho tủ nhà.",
    moTaEn: "Hundreds of Australian wines on offer all through Black Friday week — the best time of year to stock the cellar.",
    dieuKien: "Áp dụng cho các chai trong bộ sưu tập Black Friday, đến hết hàng.",
    dieuKienEn: "Applies to bottles in the Black Friday collection while stocks last.",
    thoiGian: "Đến 30/11/2026",
    thoiGianEn: "Until 30 Nov 2026",
  },
  {
    id: "thung-6-chai",
    loai: "combo",
    trangThai: "dang-dien-ra",
    href: "/danh-muc/99-6-packs",
    tieuDe: "Thùng 6 chai",
    tieuDeEn: "Six-packs",
    uuDai: "Miễn phí giao hàng",
    uuDaiEn: "Free delivery",
    moTa: "Chọn trọn một thùng 6 chai — tiết kiệm hơn mua lẻ và được giao tận nơi.",
    moTaEn: "Pick a full case of six — better value than single bottles, delivered to your door.",
    dieuKien: "Miễn phí giao hàng cho đơn từ một thùng 6 chai.",
    dieuKienEn: "Free delivery on orders of one six-pack or more.",
    thoiGian: "Quanh năm",
    thoiGianEn: "All year round",
  },
  {
    id: "mua-2-tang-qua",
    loai: "qua-tang",
    trangThai: "dang-dien-ra",
    href: "/danh-muc/welcome20-discount",
    tieuDe: "Mua 2 chai, tặng túi quà",
    tieuDeEn: "Buy 2 bottles, get a gift bag",
    uuDai: "Tặng túi quà kèm thiệp",
    uuDaiEn: "Free gift bag with card",
    moTa: "Mua từ hai chai bất kỳ, nhận túi quà cao cấp kèm thiệp viết tay — sẵn sàng để tặng.",
    moTaEn: "Buy any two bottles and receive a premium gift bag with a handwritten card — ready to give.",
    dieuKien: "Mỗi đơn tặng một túi quà. Số lượng có hạn.",
    dieuKienEn: "One gift bag per order. Limited quantity.",
    thoiGian: "Đến 31/12/2026",
    thoiGianEn: "Until 31 Dec 2026",
  },
  {
    id: "eofy-2026",
    loai: "giam-gia",
    trangThai: "dang-dien-ra",
    href: "/danh-muc/eofy-2026",
    tieuDe: "EOFY 2026",
    tieuDeEn: "EOFY 2026",
    uuDai: "Ưu đãi cuối năm tài chính",
    uuDaiEn: "End-of-financial-year offers",
    moTa: "Tuyển chọn những chai vang đang có giá tốt nhất nhân dịp cuối năm tài chính.",
    moTaEn: "A selection of wines at their best prices for the end of the financial year.",
    dieuKien: "Áp dụng cho các chai trong bộ sưu tập EOFY 2026.",
    dieuKienEn: "Applies to bottles in the EOFY 2026 collection.",
    thoiGian: "Đến 31/10/2026",
    thoiGianEn: "Until 31 Oct 2026",
  },
  {
    id: "goi-cau-lac-bo",
    loai: "combo",
    trangThai: "dang-dien-ra",
    href: "/danh-muc/club-packs",
    tieuDe: "Gói câu lạc bộ",
    tieuDeEn: "Club packs",
    uuDai: "Rượu tuyển chọn theo gói",
    uuDaiEn: "Curated wines by the pack",
    moTa: "Những gói rượu do chuyên gia chọn sẵn — khám phá nhiều phong cách trong một lần đặt.",
    moTaEn: "Wine packs chosen by our specialists — discover several styles in a single order.",
    dieuKien: "Mỗi gói gồm nhiều chai khác nhau, giá đã gồm ưu đãi.",
    dieuKienEn: "Each pack contains several different bottles, offer already included in the price.",
    thoiGian: "Quanh năm",
    thoiGianEn: "All year round",
  },
  {
    id: "qua-tet-2027",
    loai: "qua-tang",
    trangThai: "sap-dien-ra",
    href: "/danh-muc/limited-vineyard-release",
    tieuDe: "Quà Tết 2027",
    tieuDeEn: "Lunar New Year gifts 2027",
    uuDai: "Hộp quà & quà doanh nghiệp",
    uuDaiEn: "Gift boxes & corporate gifts",
    moTa: "Đặt sớm hộp quà Tết và quà tặng doanh nghiệp, nhận tư vấn riêng và giao đúng hẹn.",
    moTaEn: "Order Lunar New Year gift boxes and corporate gifts early, with personal advice and on-time delivery.",
    dieuKien: "Nhận tư vấn số lượng lớn qua nút Gọi ngay hoặc Chat với AI.",
    dieuKienEn: "For bulk orders, reach us with the Call or Chat with AI buttons.",
    thoiGian: "Mở đặt từ 01/12/2026",
    thoiGianEn: "Orders open 1 Dec 2026",
  },
];
