import {
  DANH_MUC_MA,
  danhGiaMa,
  maLoiNhat,
  timMa,
  tinhThung,
  tinhUuDai,
  type DongTinh,
} from "@/lib/khuyen-mai";

const HOM_NAY = new Date("2026-10-13T10:00:00");
const dong = (title: string, price: number, soLuong: number): DongTinh => ({ title, price, soLuong });

/** Giỏ trong bản thiết kế: 2×385k + 2×525k + 1×280k = 2.100.000đ, 5 chai. */
const GIO_THIET_KE = [
  dong("Stepping Stone Shiraz 2024", 385_000, 2),
  dong("Schild Estate Clare Valley Riesling 2025", 525_000, 2),
  dong("Bone Dry Pinot Gris 2026", 280_000, 1),
];

describe("thùng 6 chai tự chọn", () => {
  it("5 chai: chưa giảm, thiếu 1; thêm Merlot 385k thì tiết kiệm ≈ 248.000đ (khớp bản thiết kế)", () => {
    const t = tinhThung(GIO_THIET_KE, 385_000);
    expect(t.soChai).toBe(5);
    expect(t.soThung).toBe(0);
    expect(t.chaiConThieu).toBe(1);
    expect(t.giam).toBe(0);
    expect(t.tietKiemThemUocTinh).toBe(248_000);
  });

  it("đủ 6 chai Stepping Stone (385k) → giảm 10% = 231.000đ (khớp bản xem trước admin)", () => {
    const t = tinhThung([dong("Stepping Stone Shiraz", 385_000, 6)]);
    expect(t.soThung).toBe(1);
    expect(t.chaiConThieu).toBe(0);
    expect(t.giam).toBe(231_000);
    expect(t.tietKiemThemUocTinh).toBeNull();
  });

  it("7 chai: chỉ 6 chai ĐẮT NHẤT được giảm; chai lẻ thừa không", () => {
    const t = tinhThung([dong("A", 500_000, 6), dong("B", 100_000, 1)]);
    expect(t.soThung).toBe(1);
    expect(t.giam).toBe(300_000);
    expect(t.chaiConThieu).toBe(5);
  });

  it("12 chai = hai thùng", () => {
    expect(tinhThung([dong("A", 100_000, 12)]).soThung).toBe(2);
  });

  it("thùng đóng sẵn (6 pack) không tính vào số chai lẻ", () => {
    const t = tinhThung([dong("Bone Dry Pinot Gris 6 Pack", 1_500_000, 1), dong("A", 100_000, 2)]);
    expect(t.soChai).toBe(2);
  });

  it("giỏ rỗng: thiếu đủ 6", () => {
    const t = tinhThung([]);
    expect(t.chaiConThieu).toBe(6);
    expect(t.giam).toBe(0);
  });
});

describe("mã giảm giá", () => {
  const bc = (tamTinh: number, soChai: number) => ({ tamTinh, soChai, thanhVienClub: true, homNay: HOM_NAY });

  it("TET2027: dùng được từ 1.000.000đ, giảm 100.000đ", () => {
    expect(danhGiaMa(timMa("tet2027")!, bc(2_100_000, 5))).toMatchObject({ hopLe: true, giam: 100_000 });
    expect(danhGiaMa(timMa("TET2027")!, bc(900_000, 3)).lyDo).toEqual({ loai: "thieu-don", thieu: 100_000 });
  });

  it("VIP500 thiếu 900.000đ ở giỏ 2.100.000đ (khớp thông báo trong bản thiết kế)", () => {
    const r = danhGiaMa(timMa("VIP500")!, bc(2_100_000, 5));
    expect(r.hopLe).toBe(false);
    expect(r.lyDo).toEqual({ loai: "thieu-don", thieu: 900_000 });
  });

  it("WINECLUB giảm 5% nhưng chặn trần 80.000đ", () => {
    expect(danhGiaMa(timMa("WINECLUB")!, bc(2_100_000, 5)).giam).toBe(80_000);
    expect(danhGiaMa(timMa("WINECLUB")!, bc(1_000_000, 3)).giam).toBe(50_000);
  });

  it("WINECLUB chỉ dành cho thành viên", () => {
    const r = danhGiaMa(timMa("WINECLUB")!, { ...bc(2_100_000, 5), thanhVienClub: false });
    expect(r.hopLe).toBe(false);
    expect(r.lyDo).toEqual({ loai: "chi-club" });
  });

  it("HOPQUA tặng quà khi đủ 6 chai, thiếu 1 chai ở giỏ 5 chai", () => {
    expect(danhGiaMa(timMa("HOPQUA")!, bc(2_100_000, 5)).lyDo).toEqual({ loai: "thieu-chai", thieu: 1 });
    const du = danhGiaMa(timMa("HOPQUA")!, bc(2_500_000, 6));
    expect(du).toMatchObject({ hopLe: true, giam: 0, tangQua: true });
  });

  it("mã hết hạn bị từ chối", () => {
    const r = danhGiaMa(timMa("TET2027")!, { ...bc(2_000_000, 5), homNay: new Date("2027-02-01T00:00:00") });
    expect(r.lyDo).toEqual({ loai: "het-han" });
  });

  it("mã có lợi nhất trong giỏ thiết kế là TET2027 (100k > WINECLUB 80k)", () => {
    const ds = DANH_MUC_MA.filter((m) => !m.anKhoiDanhSach).map((m) => danhGiaMa(m, bc(2_100_000, 5)));
    expect(maLoiNhat(ds)).toBe("TET2027");
  });

  it("không có mã nào giảm tiền thì không có 'có lợi nhất'", () => {
    expect(maLoiNhat([])).toBeNull();
  });
});

describe("tổng hợp một đơn", () => {
  it("khớp bản thiết kế: 2.100.000 − TET2027 100.000 + miễn phí giao = 2.000.000, tiết kiệm 150.000", () => {
    const u = tinhUuDai(GIO_THIET_KE, "TET2027", { homNay: HOM_NAY });
    expect(u.tamTinh).toBe(2_100_000);
    expect(u.giamMa).toBe(100_000);
    expect(u.mienPhiGiao).toBe(true);
    expect(u.phiGiao).toBe(0);
    expect(u.tongThanhToan).toBe(2_000_000);
    expect(u.tietKiem).toBe(150_000);
  });

  it("đơn dưới 1.500.000đ thì tính phí giao 50.000đ và báo còn thiếu bao nhiêu để miễn phí", () => {
    const u = tinhUuDai([dong("A", 400_000, 2)], null, { homNay: HOM_NAY });
    expect(u.mienPhiGiao).toBe(false);
    expect(u.phiGiao).toBe(50_000);
    expect(u.giaoConThieu).toBe(700_000);
    expect(u.tongThanhToan).toBe(850_000);
  });

  it("ưu đãi thùng được trừ TRƯỚC khi xét mã và ngưỡng miễn phí giao", () => {
    // 6 × 260k = 1.560.000; giảm thùng 156.000 → 1.404.000 < 1.500.000 ⇒ không miễn phí giao
    const u = tinhUuDai([dong("A", 260_000, 6)], null, { homNay: HOM_NAY });
    expect(u.thung.giam).toBe(156_000);
    expect(u.tamTinhSauThung).toBe(1_404_000);
    expect(u.mienPhiGiao).toBe(false);
  });

  it("mã không hợp lệ ở giỏ hiện tại thì không trừ gì", () => {
    const u = tinhUuDai([dong("A", 400_000, 1)], "TET2027", { homNay: HOM_NAY });
    expect(u.ma?.hopLe).toBe(false);
    expect(u.giamMa).toBe(0);
  });

  it("giỏ rỗng: không phí giao, không ưu đãi", () => {
    const u = tinhUuDai([], null, { homNay: HOM_NAY });
    expect(u.tongThanhToan).toBe(0);
    expect(u.phiGiao).toBe(0);
    expect(u.tietKiem).toBe(0);
  });
});
