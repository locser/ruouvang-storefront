/**
 * BỘ MÁY KHUYẾN MÃI phía giao diện — thuần, không phụ thuộc React/Next, kiểm thử được.
 *
 * Nguồn thiết kế: "C.W. Wines – Khuyến mãi & mã giảm giá" (trang sản phẩm, giỏ hàng, chọn mã).
 * Bốn loại ưu đãi cùng tồn tại trong một đơn:
 *
 *   1. THÙNG 6 CHAI TỰ CHỌN — đủ 6 chai bất kỳ (không phải thùng đóng sẵn) thì giảm 10% cho
 *      các chai trong thùng. Đủ 12 chai là hai thùng… Chai lẻ thừa không được giảm.
 *   2. MIỄN PHÍ GIAO HÀNG — khi tạm tính (đã trừ ưu đãi thùng) từ 1.500.000đ.
 *   3. MÃ GIẢM GIÁ — tối đa MỘT mã mỗi đơn: giảm tiền, giảm %, hoặc tặng quà kèm.
 *   4. TẶNG KÈM — gắn với mã (vd hộp quà gỗ khi đủ 6 chai).
 *
 * ⚠️ ĐÂY LÀ LOGIC HIỂN THỊ. Đơn thật vẫn do Medusa tính (xem `app/api/dat-hang`), chưa nhận
 * các ưu đãi này; khi backend có khuyến mãi tương ứng thì dùng cùng bảng quy tắc ở đây và bỏ cờ
 * `KHUYEN_MAI_DEMO`. Danh mục mã dưới đây là DỮ LIỆU DEMO lấy từ bản thiết kế.
 */

export const KHUYEN_MAI_DEMO = false;

export const CHINH_SACH = {
  chaiMoiThung: 6,
  phanTramThung: 10,
  nguongMienPhiGiaoVnd: 1_500_000,
  phiGiaoVnd: 50_000,
} as const;

/** Thùng/gói đóng sẵn có giá riêng: không tính vào số chai để lên thùng tự chọn. */
const LA_THUNG_SAN = /\b(pack|case|dozen|carton)\b/i;

export interface DongTinh {
  title: string;
  price: number;
  soLuong: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Thùng 6 chai tự chọn
// ─────────────────────────────────────────────────────────────────────────────

export interface KetQuaThung {
  /** Số chai lẻ đủ điều kiện lên thùng (loại thùng đóng sẵn). */
  soChai: number;
  soThung: number;
  /** Còn thiếu bao nhiêu chai để lên thùng kế tiếp; 0 khi đang đúng bội số của 6 (và có chai). */
  chaiConThieu: number;
  giam: number;
  /** Số chai được giảm (= soThung × 6). */
  chaiDuocGiam: number;
  /** Ước tính tiền giảm THÊM nếu mua đủ chai còn thiếu (làm tròn xuống nghìn); null khi không áp dụng. */
  tietKiemThemUocTinh: number | null;
}

function giamThung(giaTungChai: number[], soThung: number): number {
  // Giảm cho các chai ĐẮT NHẤT trước (có lợi cho khách, và dễ giải thích: "chai đắt nhất vào thùng").
  const duoc = [...giaTungChai].sort((a, b) => b - a).slice(0, soThung * CHINH_SACH.chaiMoiThung);
  const tong = duoc.reduce((s, g) => s + g, 0);
  return Math.round((tong * CHINH_SACH.phanTramThung) / 100);
}

export function tinhThung(dong: DongTinh[], giaChaiGoiY?: number): KetQuaThung {
  const gia: number[] = [];
  for (const d of dong) {
    if (LA_THUNG_SAN.test(d.title)) continue;
    for (let i = 0; i < d.soLuong; i++) gia.push(d.price);
  }
  const soChai = gia.length;
  const soThung = Math.floor(soChai / CHINH_SACH.chaiMoiThung);
  const du = soChai % CHINH_SACH.chaiMoiThung;
  const chaiConThieu = soChai === 0 ? CHINH_SACH.chaiMoiThung : du === 0 ? 0 : CHINH_SACH.chaiMoiThung - du;
  const giam = giamThung(gia, soThung);

  let tietKiemThemUocTinh: number | null = null;
  if (chaiConThieu > 0 && giaChaiGoiY && giaChaiGoiY > 0) {
    const them = [...gia, ...Array.from({ length: chaiConThieu }, () => giaChaiGoiY)];
    const moi = giamThung(them, Math.floor(them.length / CHINH_SACH.chaiMoiThung));
    tietKiemThemUocTinh = Math.floor(Math.max(0, moi - giam) / 1000) * 1000;
  }

  return {
    soChai,
    soThung,
    chaiConThieu,
    giam,
    chaiDuocGiam: soThung * CHINH_SACH.chaiMoiThung,
    tietKiemThemUocTinh,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mã giảm giá
// ─────────────────────────────────────────────────────────────────────────────

export type KieuMa = "tien" | "phan-tram" | "qua-tang";

export interface MaGiam {
  ma: string;
  kieu: KieuMa;
  /** Số tiền (đồng) với kiểu `tien`; số phần trăm với `phan-tram`; bỏ qua với `qua-tang`. */
  giaTri: number;
  toiDa?: number;
  donToiThieu?: number;
  chaiToiThieu?: number;
  /** ISO yyyy-mm-dd, hết hạn cuối ngày đó. */
  hetHan: string;
  chiThanhVienClub?: boolean;
  conLuot?: number;
  /** Khoá i18n mô tả (dùng cho mã tặng quà). */
  moTaKhoa?: string;
  /** Khách phải gõ tay mới dùng được — không liệt kê trong danh sách gợi ý. */
  anKhoiDanhSach?: boolean;
}

/**
 * DANH MỤC MÃ DEMO (từ bản thiết kế). `WELCOME20` là mã đang quảng cáo ở trang chủ
 * (`cwwines-theme.json`) — chỉ dùng được khi gõ tay, không chiếm danh sách gợi ý.
 */
export const DANH_MUC_MA: MaGiam[] = [
  { ma: "TET2027", kieu: "tien", giaTri: 100_000, donToiThieu: 1_000_000, hetHan: "2027-01-31" },
  {
    ma: "WINECLUB",
    kieu: "phan-tram",
    giaTri: 5,
    toiDa: 80_000,
    hetHan: "2027-12-31",
    chiThanhVienClub: true,
    conLuot: 2,
  },
  {
    ma: "HOPQUA",
    kieu: "qua-tang",
    giaTri: 0,
    chaiToiThieu: CHINH_SACH.chaiMoiThung,
    hetHan: "2027-01-31",
    moTaKhoa: "promo.gift_box_6",
  },
  { ma: "VIP500", kieu: "tien", giaTri: 500_000, donToiThieu: 3_000_000, hetHan: "2027-01-31" },
  {
    ma: "WELCOME20",
    kieu: "phan-tram",
    giaTri: 20,
    toiDa: 500_000,
    hetHan: "2027-12-31",
    anKhoiDanhSach: true,
  },
];

export function timMa(ma: string): MaGiam | undefined {
  const sach = (ma || "").trim().toUpperCase();
  return DANH_MUC_MA.find((m) => m.ma === sach);
}

export interface BoiCanh {
  /** Tạm tính SAU ưu đãi thùng, TRƯỚC mã. */
  tamTinh: number;
  soChai: number;
  thanhVienClub: boolean;
  homNay: Date;
}

export type LyDoKhongDung =
  | { loai: "het-han" }
  | { loai: "thieu-don"; thieu: number }
  | { loai: "thieu-chai"; thieu: number }
  | { loai: "chi-club" };

export interface KetQuaMa {
  ma: MaGiam;
  hopLe: boolean;
  giam: number;
  tangQua: boolean;
  lyDo?: LyDoKhongDung;
}

function hetHanChua(hetHan: string, homNay: Date): boolean {
  return homNay.getTime() > new Date(`${hetHan}T23:59:59`).getTime();
}

export function danhGiaMa(ma: MaGiam, bc: BoiCanh): KetQuaMa {
  const kq = (hopLe: boolean, giam: number, lyDo?: LyDoKhongDung): KetQuaMa => ({
    ma,
    hopLe,
    giam: hopLe ? giam : 0,
    tangQua: hopLe && ma.kieu === "qua-tang",
    lyDo,
  });

  if (hetHanChua(ma.hetHan, bc.homNay)) return kq(false, 0, { loai: "het-han" });
  if (ma.chiThanhVienClub && !bc.thanhVienClub) return kq(false, 0, { loai: "chi-club" });
  if (ma.chaiToiThieu && bc.soChai < ma.chaiToiThieu) {
    return kq(false, 0, { loai: "thieu-chai", thieu: ma.chaiToiThieu - bc.soChai });
  }
  if (ma.donToiThieu && bc.tamTinh < ma.donToiThieu) {
    return kq(false, 0, { loai: "thieu-don", thieu: ma.donToiThieu - bc.tamTinh });
  }

  let giam = 0;
  if (ma.kieu === "tien") giam = ma.giaTri;
  else if (ma.kieu === "phan-tram") {
    giam = Math.round((bc.tamTinh * ma.giaTri) / 100);
    if (ma.toiDa) giam = Math.min(giam, ma.toiDa);
  }
  return kq(true, Math.min(giam, bc.tamTinh), undefined);
}

/** Mã có lợi nhất (giảm nhiều nhất) trong các mã dùng được; null nếu không mã nào giảm tiền. */
export function maLoiNhat(ds: KetQuaMa[]): string | null {
  const tot = ds.filter((d) => d.hopLe && d.giam > 0).sort((a, b) => b.giam - a.giam)[0];
  return tot ? tot.ma.ma : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tổng hợp một đơn
// ─────────────────────────────────────────────────────────────────────────────

export interface UuDai {
  tamTinh: number;
  thung: KetQuaThung;
  tamTinhSauThung: number;
  /** Mã đang áp (đã đánh giá); null nếu chưa chọn mã. */
  ma: KetQuaMa | null;
  giamMa: number;
  tangQua: boolean;
  phiGiaoGoc: number;
  phiGiao: number;
  mienPhiGiao: boolean;
  /** Còn thiếu bao nhiêu để được miễn phí giao; 0 nếu đã đủ. */
  giaoConThieu: number;
  tongThanhToan: number;
  /** Tổng tiền khách tiết kiệm được: ưu đãi thùng + mã + phí giao được miễn. */
  tietKiem: number;
}

export function tinhUuDai(
  dong: DongTinh[],
  maDangDung: string | null,
  tuyChon: { thanhVienClub?: boolean; homNay?: Date; giaChaiGoiY?: number } = {}
): UuDai {
  const homNay = tuyChon.homNay ?? new Date();
  const thanhVienClub = tuyChon.thanhVienClub ?? true;

  const tamTinh = dong.reduce((s, d) => s + d.price * d.soLuong, 0);
  const thung = tinhThung(dong, tuyChon.giaChaiGoiY);
  const tamTinhSauThung = Math.max(0, tamTinh - thung.giam);

  const m = maDangDung ? timMa(maDangDung) : undefined;
  const ma = m
    ? danhGiaMa(m, { tamTinh: tamTinhSauThung, soChai: thung.soChai, thanhVienClub, homNay })
    : null;
  const giamMa = ma?.giam ?? 0;

  const coHang = tamTinh > 0;
  const phiGiaoGoc = coHang ? CHINH_SACH.phiGiaoVnd : 0;
  const mienPhiGiao = coHang && tamTinhSauThung >= CHINH_SACH.nguongMienPhiGiaoVnd;
  const phiGiao = mienPhiGiao ? 0 : phiGiaoGoc;
  const giaoConThieu = mienPhiGiao ? 0 : Math.max(0, CHINH_SACH.nguongMienPhiGiaoVnd - tamTinhSauThung);

  const tongThanhToan = Math.max(0, tamTinhSauThung - giamMa) + phiGiao;
  const tietKiem = thung.giam + giamMa + (mienPhiGiao ? phiGiaoGoc : 0);

  return {
    tamTinh,
    thung,
    tamTinhSauThung,
    ma,
    giamMa,
    tangQua: ma?.tangQua ?? false,
    phiGiaoGoc,
    phiGiao,
    mienPhiGiao,
    giaoConThieu,
    tongThanhToan,
    tietKiem,
  };
}

/** "2027-01-31" → "31/01/2027" */
export function dinhDangNgayHetHan(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
