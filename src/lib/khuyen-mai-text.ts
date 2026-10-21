/**
 * Chuyển kết quả đánh giá mã (lib/khuyen-mai.ts) thành KHOÁ i18n + tham số để giao diện hiển thị.
 * Tách riêng để lib/khuyen-mai.ts giữ thuần (không dính định dạng tiền, ngôn ngữ).
 */
import type { KetQuaMa } from "./khuyen-mai";
import { dinhDangNgayHetHan } from "./khuyen-mai";
import type { VarsNgonNgu } from "@/components/T";
import { tienSong } from "@/lib/tien";

/** Khoá i18n + tham số. Tham số tiền là `tienSong(…)`, hiển thị đúng theo ngôn ngữ. */
export type ThongDiep = { k: string; v?: VarsNgonNgu };

/** Thông báo ngay dưới ô nhập mã khi khách bấm Áp dụng mà mã chưa dùng được. */
export function loiNhapMa(kq: KetQuaMa): ThongDiep {
  const ly = kq.lyDo;
  switch (ly?.loai) {
    case "thieu-don":
      return { k: "promo.err_min_order", v: { min: tienSong(kq.ma.donToiThieu ?? 0), thieu: tienSong(ly.thieu) } };
    case "thieu-chai":
      return { k: "promo.err_min_bottles", v: { n: kq.ma.chaiToiThieu ?? 0 } };
    case "chi-club":
      return { k: "promo.err_club" };
    default:
      return { k: "promo.err_unknown" };
  }
}

/** Dòng lý do ngắn trong mục "Chưa dùng được". */
export function lyDoTrongDanhSach(kq: KetQuaMa): ThongDiep {
  const ly = kq.lyDo;
  switch (ly?.loai) {
    case "thieu-don":
      return { k: "promo.reason_short", v: { so: tienSong(ly.thieu) } };
    case "thieu-chai":
      return { k: "promo.reason_add_bottles", v: { n: ly.thieu } };
    case "chi-club":
      return { k: "promo.reason_club" };
    default:
      return { k: "promo.reason_expired" };
  }
}

/** Dòng giá trị của mã: "−100.000đ", "−5%, tối đa 80.000đ" hoặc mô tả quà tặng. */
export function giaTriMa(kq: KetQuaMa): ThongDiep {
  const m = kq.ma;
  if (m.kieu === "tien") return { k: "promo.val_money", v: { so: tienSong(m.giaTri) } };
  if (m.kieu === "phan-tram") {
    return m.toiDa
      ? { k: "promo.val_pct", v: { pct: m.giaTri, max: tienSong(m.toiDa) } }
      : { k: "promo.val_pct_nomax", v: { pct: m.giaTri } };
  }
  return { k: m.moTaKhoa ?? "promo.val_gift" };
}

/** Các điều kiện đi kèm, mỗi phần một thông điệp (giao diện nối bằng " · "). */
export function dieuKienMa(kq: KetQuaMa): ThongDiep[] {
  const m = kq.ma;
  const ds: ThongDiep[] = [];
  if (m.chiThanhVienClub) ds.push({ k: "promo.cond_club" });
  if (m.donToiThieu) ds.push({ k: "promo.cond_min_order", v: { so: tienSong(m.donToiThieu) } });
  if (m.conLuot) ds.push({ k: "promo.cond_left", v: { n: m.conLuot } });
  // Mã lấy từ Medusa không có ngày hết hạn riêng: chỉ hiện dòng này khi có ngày thật.
  if (m.hetHan) ds.push({ k: "promo.cond_expires", v: { ngay: dinhDangNgayHetHan(m.hetHan) } });
  return ds;
}
