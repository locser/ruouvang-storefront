import {
  chuyenKhoanSanSang,
  kiemTraGiaoDich,
  nganHangTuCaiDat,
  nhomSoTaiKhoan,
  noiDungChuyenKhoan,
  urlVietQR,
} from "@/lib/chuyen-khoan";

describe("noiDungChuyenKhoan", () => {
  it("thêm tiền tố CW vào mã đơn Medusa (chỉ có số)", () => {
    expect(noiDungChuyenKhoan("12")).toBe("CW12");
  });

  it("bỏ ký tự không phải chữ/số — ngân hàng hay cắt dấu gạch", () => {
    expect(noiDungChuyenKhoan("CW-260807-K3M9Q")).toBe("CW260807K3M9Q");
  });

  it("không nhân đôi tiền tố và luôn in hoa", () => {
    expect(noiDungChuyenKhoan("cw100482")).toBe("CW100482");
  });
});

describe("nhomSoTaiKhoan", () => {
  it("nhóm bốn số một cho dễ đọc, không thêm khoảng trắng cuối", () => {
    expect(nhomSoTaiKhoan("0123456789")).toBe("0123 4567 89");
    expect(nhomSoTaiKhoan("12345678")).toBe("1234 5678");
  });
});

describe("kiemTraGiaoDich", () => {
  it("chưa nối ngân hàng thì luôn báo đang chờ", async () => {
    await expect(kiemTraGiaoDich("12")).resolves.toEqual({ trangThai: "cho" });
  });
});

describe("urlVietQR", () => {
  it("không khai mã ngân hàng thì không có URL (trang chỉ hiện thông tin chuyển thủ công)", () => {
    const nh = nganHangTuCaiDat({ bank_bin: "", bank_account: "0123456789" });
    expect(urlVietQR(2205000, "CW12", nh)).toBeNull();
  });

  it("điền sẵn số tiền, nội dung và tên chủ tài khoản", () => {
    const nh = nganHangTuCaiDat({
      bank_bin: "VCB",
      bank_account: "0123 456 789",
      bank_name: "Vietcombank",
      bank_account_name: "CONG TY TNHH C.W WINES",
    });
    const url = new URL(urlVietQR(2205000.4, "CW12", nh)!);
    expect(url.origin + url.pathname).toBe("https://img.vietqr.io/image/VCB-0123456789-compact2.png");
    expect(url.searchParams.get("amount")).toBe("2205000");
    expect(url.searchParams.get("addInfo")).toBe("CW12");
    expect(url.searchParams.get("accountName")).toBe("CONG TY TNHH C.W WINES");
  });
});

describe("chuyenKhoanSanSang", () => {
  it("cần đủ tên ngân hàng, số tài khoản và chủ tài khoản", () => {
    expect(chuyenKhoanSanSang(nganHangTuCaiDat({}))).toBe(false);
    expect(
      chuyenKhoanSanSang(nganHangTuCaiDat({ bank_name: "VCB", bank_account: "1", bank_account_name: "A" }))
    ).toBe(true);
  });
});
