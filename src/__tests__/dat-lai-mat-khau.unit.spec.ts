import { kiemTraMatKhauMoi, taoBoGioiHan } from "@/lib/dat-lai-mat-khau";

describe("kiemTraMatKhauMoi", () => {
  it("quá ngắn", () => {
    expect(kiemTraMatKhauMoi("abc1234", "abc1234")).toBe("auth.err_rp_short");
    expect(kiemTraMatKhauMoi("", "")).toBe("auth.err_rp_short");
  });
  it("hai ô không khớp", () => {
    expect(kiemTraMatKhauMoi("matkhau123", "matkhau124")).toBe("auth.err_rp_mismatch");
  });
  it("hợp lệ: đúng 8 ký tự trở lên và khớp nhau", () => {
    expect(kiemTraMatKhauMoi("12345678", "12345678")).toBeNull();
    expect(kiemTraMatKhauMoi("Mật khẩu dài hơn", "Mật khẩu dài hơn")).toBeNull();
  });
  it("kiểm độ dài trước khi kiểm khớp", () => {
    expect(kiemTraMatKhauMoi("abc", "xyz")).toBe("auth.err_rp_short");
  });
});

describe("taoBoGioiHan", () => {
  it("cho tối đa N lượt trong cửa sổ, lượt thứ N+1 bị chặn", () => {
    const vuot = taoBoGioiHan(3, 60_000);
    expect([1, 2, 3].map(() => vuot("a", 1000))).toEqual([false, false, false]);
    expect(vuot("a", 2000)).toBe(true);
    expect(vuot("a", 3000)).toBe(true);
  });
  it("mỗi khoá đếm riêng", () => {
    const vuot = taoBoGioiHan(1, 60_000);
    expect(vuot("a", 1000)).toBe(false);
    expect(vuot("b", 1000)).toBe(false);
    expect(vuot("a", 1001)).toBe(true);
  });
  it("hết cửa sổ thì được dùng lại", () => {
    const vuot = taoBoGioiHan(1, 60_000);
    vuot("a", 1000);
    expect(vuot("a", 1500)).toBe(true);
    expect(vuot("a", 62_000)).toBe(false);
  });
});
