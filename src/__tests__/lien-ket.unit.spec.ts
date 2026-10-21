import fs from "node:fs";
import path from "node:path";
import {
  THU_MUC_SRC,
  docDanhMucNguon,
  docSanPhamNguon,
} from "./du-lieu-cwwines";

function docTatCaTep(thuMuc: string): string[] {
  return fs.readdirSync(thuMuc, { withFileTypes: true }).flatMap((muc) => {
    const duongDan = path.join(thuMuc, muc.name);
    if (muc.isDirectory() && muc.name === "__tests__") return [];
    if (muc.isDirectory()) return docTatCaTep(duongDan);
    return /\.(?:ts|tsx|json)$/.test(muc.name) ? [duongDan] : [];
  });
}

function handleGhimCung(loai: "danh-muc" | "san-pham"): string[] {
  const mau = new RegExp(`/${loai}/([a-z0-9][a-z0-9-]*)`, "g");
  const mauHam =
    loai === "danh-muc"
      ? /duongDanDanhMuc\(["']([a-z0-9][a-z0-9-]*)["']\)/g
      : /duongDanSanPham\(["']([a-z0-9][a-z0-9-]*)["']\)/g;
  const ketQua = new Set<string>();
  for (const tep of docTatCaTep(THU_MUC_SRC)) {
    const noiDung = fs.readFileSync(tep, "utf8");
    for (const khop of noiDung.matchAll(mau)) ketQua.add(khop[1]);
    for (const khop of noiDung.matchAll(mauHam)) ketQua.add(khop[1]);
  }
  return [...ketQua].sort();
}

describe("liên kết ghim cứng phải trỏ tới dữ liệu thật", () => {
  test("B2 — không còn link tiếp tục mua sắm dùng handle của shop khác", () => {
    const handleThat = new Set(docDanhMucNguon().map((danhMuc) => danhMuc.handle));
    const handleMa = handleGhimCung("danh-muc").filter((handle) => !handleThat.has(handle));
    expect(handleMa).toEqual([]);
  });

  test("B3 — link khuyến mãi trang chủ là một danh mục có thật", () => {
    const handleThat = new Set(docDanhMucNguon().map((danhMuc) => danhMuc.handle));
    const handleMa = handleGhimCung("danh-muc").filter((handle) => !handleThat.has(handle));
    const handleCu = ["khuyen", "mai", "ruou", "vang"].join("-");
    expect(handleMa).not.toContain(handleCu);
  });

  test("mọi link sản phẩm ghim cứng đều tồn tại trong dữ liệu nguồn", () => {
    const handleThat = new Set(docSanPhamNguon().map((sanPham) => sanPham.handle));
    expect(handleGhimCung("san-pham").filter((handle) => !handleThat.has(handle))).toEqual([]);
  });
});
