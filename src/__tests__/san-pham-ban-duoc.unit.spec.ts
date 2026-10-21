import { audSangVnd, sanPhamBanDuoc } from "@/lib/san-pham-ban-duoc";
import { docSanPhamNguon } from "./du-lieu-cwwines";

describe("B4 — quy tắc sản phẩm bán được dùng chung", () => {
  test("loại đúng ba sản phẩm giá 0 khỏi mọi nguồn sinh liên kết", () => {
    const biLoai = docSanPhamNguon().filter((sp) => !sanPhamBanDuoc(sp));
    expect(biLoai.map((sp) => sp.handle).sort()).toEqual([
      "handpicked-schild-estate-pack",
      "manly-sea-eagles-magnum",
      "pafc-member-offer",
    ]);
  });

  test("giữ sản phẩm có ít nhất một biến thể mang giá dương", () => {
    expect(
      sanPhamBanDuoc({ priceAud: 0, variants: [{ priceAud: 0 }, { priceAud: 25 }] })
    ).toBe(true);
    expect(sanPhamBanDuoc({ priceAud: 0, variants: [{ priceAud: 0 }] })).toBe(false);
  });
});

describe("quy đổi giá AUD sang VND", () => {
  test("nhân 17.500 và làm tròn lên bội 1.000", () => {
    expect(audSangVnd(19.95)).toBe(350_000);
    expect(audSangVnd(60)).toBe(1_050_000);
  });

  test("giá 0 không bán được và VND dùng trực tiếp đơn vị đồng", () => {
    expect(audSangVnd(0)).toBe(0);
    expect(audSangVnd(-1)).toBe(0);
    expect(350_000).toBe(350_000);
  });
});
