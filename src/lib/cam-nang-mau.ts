import type { BaiViet, DanhMucBlog } from "@/lib/blog";
import type { Locale } from "@/i18n/config";

/**
 * BÀI VIẾT MẪU cho trang Cẩm nang — lấy từ bản thiết kế `cam-nang-v2.html`.
 *
 * Chỉ được dùng khi Medusa KHÔNG trả bài viết nào (backend chưa chạy hoặc chưa
 * soạn bài), để trang vẫn có nội dung khi trình bày. Khi Medusa có bài thật, bộ
 * này không bao giờ được đọc tới — xem `app/blog/page.tsx`.
 *
 * Bài mẫu chưa có trang chi tiết (`/blog/<slug>` sẽ 404), nên mỗi bài trỏ tới
 * trang tìm kiếm sản phẩm liên quan (`href`) thay vì tới một đường dẫn chết.
 */

type DaNgu = Partial<Record<Locale, string>> & { vi: string };

export interface BaiMau extends BaiViet {
  /** Đích khi bấm vào bài (thay cho `/blog/<slug>`). */
  href: string;
  /** Dòng ghi chú ở chân thẻ (thay cho ngày đăng + thời gian đọc). */
  chuThich: DaNgu;
  /** Nhãn nút ở chân thẻ. */
  nhanLienKet: DaNgu;
  /** Từ khoá phụ giúp ô tìm kiếm ra đúng bài. */
  tuKhoa: string;
}

const dm = (id: string, slug: string, name: string, nameEn: string): DanhMucBlog => ({
  id,
  slug,
  name,
  nameEn,
});

export const DANH_MUC_MAU: DanhMucBlog[] = [
  dm("cm1", "cho-nguoi-moi", "Cho người mới", "For beginners"),
  dm("cm2", "hop-mon-an", "Hợp món ăn", "Food pairing"),
  dm("cm3", "qua-tang", "Quà tặng", "Gifting"),
  dm("cm4", "vung-giong-nho", "Vùng & giống nho", "Regions & grapes"),
  dm("cm5", "bao-quan-thuong-thuc", "Bảo quản & thưởng thức", "Storage & serving"),
];

const [NGUOI_MOI, MON_AN, QUA_TANG, VUNG, BAO_QUAN] = DANH_MUC_MAU;

const tim = (q: string) => `/tim-kiem?q=${encodeURIComponent(q)}`;

interface PhanBai {
  slug: string;
  phutDoc: number;
  tieuDe: string;
  tieuDeEn: string;
  tomTat: string;
  tomTatEn: string;
  danhMuc: DanhMucBlog[];
  href: string;
  chuThich: DaNgu;
  nhanLienKet: DaNgu;
  tuKhoa: string;
  noiBat?: boolean;
}

function bai(so: number, p: PhanBai): BaiMau {
  return {
    id: `mau-${so}`,
    thumbnail: null,
    publishedAt: null,
    noiBat: false,
    tacGia: null,
    the: [],
    ...p,
  };
}

/** Bài "nên đọc trước" — hiện ở khối nền tối, không nằm trong lưới. */
export const BAI_NOI_BAT_MAU: BaiMau = bai(0, {
  slug: "lan-dau-mua-vang",
  noiBat: true,
  phutDoc: 5,
  tieuDe: "Lần đầu mua rượu vang: bắt đầu từ đâu?",
  tieuDeEn: "Buying wine for the first time: where to start?",
  tomTat:
    "Ba câu hỏi giúp bạn chọn đúng chai trong vài phút: bạn ăn món gì, thích vị nhẹ hay đậm, và ngân sách bao nhiêu.",
  tomTatEn:
    "Three questions that help you pick the right bottle in minutes: what you're eating, whether you like it light or bold, and your budget.",
  danhMuc: [NGUOI_MOI],
  href: tim("vang dễ uống"),
  chuThich: { vi: "5 phút đọc · Cho người mới", en: "5 min read · For beginners" },
  nhanLienKet: { vi: "Đọc bài viết", en: "Read the article" },
  tuKhoa: "người mới lần đầu bắt đầu",
});

export const BAI_MAU: BaiMau[] = [
  bai(1, {
    slug: "vang-do-bua-bo-nuong",
    phutDoc: 4,
    tieuDe: "Vang đỏ nào cho bữa bò nướng?",
    tieuDeEn: "Which red wine for a grilled beef dinner?",
    tomTat: "Vì sao Shiraz thường là lựa chọn an toàn, và khi nào nên thử một chai nhẹ hơn.",
    tomTatEn: "Why Shiraz is usually the safe choice, and when to try something lighter.",
    danhMuc: [MON_AN],
    href: tim("Shiraz"),
    chuThich: { vi: "Chai trong bài: Stepping Stone Shiraz", en: "Bottle in this piece: Stepping Stone Shiraz" },
    nhanLienKet: { vi: "Xem chai", en: "View bottle" },
    tuKhoa: "bò nướng sườn shiraz vang đỏ đậm món ăn",
  }),
  bai(2, {
    slug: "chon-vang-bieu-sep-doi-tac",
    phutDoc: 5,
    tieuDe: "Chọn rượu vang biếu sếp và đối tác",
    tieuDeEn: "Choosing wine to gift your boss and partners",
    tomTat: "Cách chọn theo ngân sách, điều nên tránh, và cách trình bày để món quà để lại ấn tượng.",
    tomTatEn: "How to choose by budget, what to avoid, and how to present it so the gift leaves an impression.",
    danhMuc: [QUA_TANG],
    href: tim("hộp quà"),
    chuThich: { vi: "Có hộp quà và thiệp kèm theo", en: "Gift box and card available" },
    nhanLienKet: { vi: "Xem quà", en: "View gifts" },
    tuKhoa: "quà tết biếu sếp hộp quà tặng đối tác",
  }),
  bai(3, {
    slug: "vang-trang-de-uong-cho-nguoi-moi",
    phutDoc: 4,
    tieuDe: "Vang trắng dễ uống cho người mới",
    tieuDeEn: "Easy-drinking white wines for beginners",
    tomTat: "Những dòng ít chua, thơm nhẹ, uống lạnh vừa phải, hợp để làm quen với rượu vang.",
    tomTatEn: "Low-acid, lightly aromatic styles served gently chilled, ideal for getting to know wine.",
    danhMuc: [NGUOI_MOI],
    href: tim("Riesling"),
    chuThich: { vi: "Chai trong bài: Clare Valley Riesling", en: "Bottle in this piece: Clare Valley Riesling" },
    nhanLienKet: { vi: "Xem chai", en: "View bottle" },
    tuKhoa: "người mới vang nhẹ dễ uống riesling pinot gris",
  }),
  bai(4, {
    slug: "ban-do-vang-uc-ba-phut",
    phutDoc: 3,
    tieuDe: "Bản đồ rượu vang Úc trong ba phút",
    tieuDeEn: "A map of Australian wine in three minutes",
    tomTat: "Barossa, McLaren Vale, Coonawarra, Limestone Coast: mỗi vùng cho một phong cách riêng.",
    tomTatEn: "Barossa, McLaren Vale, Coonawarra, Limestone Coast: each region has its own style.",
    danhMuc: [VUNG],
    href: tim("Barossa"),
    chuThich: { vi: "Mua theo vùng", en: "Shop by region" },
    nhanLienKet: { vi: "Khám phá", en: "Explore" },
    tuKhoa: "vùng úc barossa mclaren vale coonawarra limestone coast giống nho",
  }),
  bai(5, {
    slug: "giu-vang-ngon-nong-am",
    phutDoc: 4,
    tieuDe: "Giữ vang ngon trong thời tiết nóng ẩm",
    tieuDeEn: "Keeping wine good in hot, humid weather",
    tomTat: "Bảo quản ở nhà, uống ở nhiệt độ nào và mở trước bao lâu để chai phát huy hết hương vị.",
    tomTatEn: "How to store it at home, what temperature to serve at, and how long to open it ahead.",
    danhMuc: [BAO_QUAN],
    href: tim("vang"),
    chuThich: { vi: "Dành cho người không có tủ vang", en: "For those without a wine fridge" },
    nhanLienKet: { vi: "Đọc tiếp", en: "Read more" },
    tuKhoa: "bảo quản nhiệt độ phục vụ mở chai rót ly nóng ẩm",
  }),
  bai(6, {
    slug: "doc-nhan-chai-dieu-quan-trong",
    phutDoc: 3,
    tieuDe: "Đọc nhãn chai: điều thực sự quan trọng",
    tieuDeEn: "Reading a wine label: what really matters",
    tomTat: "Năm sản xuất, vùng, giống nho, nồng độ: bốn thông tin đủ để bạn tự tin trước kệ rượu.",
    tomTatEn: "Vintage, region, grape, alcohol: four details are enough to feel confident at the shelf.",
    danhMuc: [NGUOI_MOI],
    href: tim("vang"),
    chuThich: { vi: "Kèm bảng tra nhanh", en: "Includes a quick-reference chart" },
    nhanLienKet: { vi: "Đọc tiếp", en: "Read more" },
    tuKhoa: "đọc nhãn chai hiểu nhãn năm sản xuất vintage nồng độ",
  }),
];
