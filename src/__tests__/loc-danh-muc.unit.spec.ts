import fs from "node:fs";
import path from "node:path";
import { dungBoLoc } from "@/lib/loc-danh-muc";
import {
  docDanhMucNguon,
  docSanPhamNguon,
  THU_MUC_SRC,
} from "./du-lieu-cwwines";

const LUA_CHON_GOC = {
  trang: 1,
  sapXep: "lien-quan",
  khoangGia: null,
  thuocTinh: {},
} as const;

describe("B1 — bộ lọc danh mục dùng handle", () => {
  test("stonehaven sinh đúng category_path theo handle, không theo tên", () => {
    const boLoc = dungBoLoc({
      ...LUA_CHON_GOC,
      handleDanhMuc: "stonehaven",
    } as any);

    expect(boLoc).toContain('category_path = "stonehaven"');
    expect(boLoc).not.toContain('category_path = "Stonehaven"');
  });

  test("mọi danh mục có hàng đều sinh filter khớp category_path dữ liệu thật", () => {
    const sanPham = docSanPhamNguon().filter((sp) =>
      sp.variants.some((bienThe) => bienThe.priceAud > 0)
    );
    const danhMucCoHang = docDanhMucNguon().filter((danhMuc) =>
      sanPham.some((sp) => sp.collections.includes(danhMuc.handle))
    );

    expect(danhMucCoHang.length).toBeGreaterThan(0);
    for (const danhMuc of danhMucCoHang) {
      const boLoc = dungBoLoc({
        ...LUA_CHON_GOC,
        handleDanhMuc: danhMuc.handle,
      } as any);
      const dieuKien = `category_path = "${danhMuc.handle}"`;
      expect(boLoc).toContain(dieuKien);
      expect(
        sanPham.some(
          (sp) => sp.collections.includes(danhMuc.handle) && boLoc.includes(dieuKien)
        )
      ).toBe(true);
    }
  });

  test("trang danh mục nối danhMuc.handle vào bộ lọc, không nối name", () => {
    const trang = fs.readFileSync(
      path.join(THU_MUC_SRC, "app/danh-muc/[handle]/page.tsx"),
      "utf8"
    );

    expect(trang).toContain("docLuaChon(danhMuc.handle, ts)");
    expect(trang).not.toContain("docLuaChon(danhMuc.name, ts)");
  });
});
