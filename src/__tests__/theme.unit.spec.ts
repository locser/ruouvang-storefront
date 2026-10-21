import {
  DANH_MUC_RONG,
  FOOTER,
  MENU,
  danhMucHienTrongDieuHuong,
} from "@/lib/theme";

describe("B7 — danh mục rỗng không xuất hiện trong điều hướng", () => {
  test("ẩn đủ 13 collection rỗng, gồm collection frontpage của Shopify", () => {
    expect(DANH_MUC_RONG).toHaveLength(13);
    expect(DANH_MUC_RONG).toContain("frontpage");
    for (const handle of DANH_MUC_RONG) {
      expect(danhMucHienTrongDieuHuong(handle)).toBe(false);
      expect(MENU.some((muc) => muc.handle === handle)).toBe(false);
      expect(
        FOOTER.cot.some((cot) =>
          cot.muc.some((muc) => muc.duongDan === `/danh-muc/${handle}`)
        )
      ).toBe(false);
    }
  });
});

describe("song ngữ", () => {
  test("nhãn chung có tiếng Việt và tên thương hiệu không bị dịch", () => {
    const cuaHang = MENU.find((muc) => muc.handle === "all");
    expect(cuaHang).toMatchObject({ ten: "Cửa hàng", tenEn: "Shop" });

    for (const ten of ["Bone Dry", "Schild Estate", "Reschke", "Ulithorne"]) {
      const thuongHieu = MENU.find((muc) => muc.tenEn === ten);
      expect(thuongHieu?.ten).toBe(ten);
    }
  });
});
