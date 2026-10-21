import fs from "node:fs";
import path from "node:path";
import manifest from "@/lib/anh-manifest.json";
import { anhCwwinesLoader, chonChieuRong } from "@/lib/anh-cwwines";
import { docSanPhamNguon, THU_MUC_SRC } from "./du-lieu-cwwines";

function docTatCaTepTsx(thuMuc: string): string[] {
  return fs.readdirSync(thuMuc, { withFileTypes: true }).flatMap((muc) => {
    const duongDan = path.join(thuMuc, muc.name);
    if (muc.isDirectory()) return docTatCaTepTsx(duongDan);
    return muc.isFile() && duongDan.endsWith(".tsx") ? [duongDan] : [];
  });
}

describe("Brief 3 — ảnh C.W. Wines chạy hoàn toàn từ máy này", () => {
  test("loader ánh xạ URL Shopify có thật sang WebP local", () => {
    const url = docSanPhamNguon()[0].images[0];
    const ketQua = anhCwwinesLoader({ src: url, width: 300 });

    expect(ketQua).toMatch(/^\/anh\/.+-400\.webp$/);
    expect(ketQua).not.toContain("cdn.shopify.com");
  });

  test("yêu cầu 300px chọn dẫn xuất 400px", () => {
    expect(chonChieuRong(300, [200, 400, 800])).toBe(400);
  });

  test.each(["/images/x.png", "data:image/png;base64,AA==", "", "https://cdn.shopify.com/khong-co.png"])(
    "đầu vào lạ không ném lỗi: %s",
    (src) => {
      expect(() => anhCwwinesLoader({ src, width: 300 })).not.toThrow();
      expect(anhCwwinesLoader({ src, width: 300 })).toBeTruthy();
    }
  );

  test("không còn img thô nhận trực tiếp thumbnail hoặc images[]", () => {
    const viPham = docTatCaTepTsx(THU_MUC_SRC)
      .map((tep) => ({ tep, noiDung: fs.readFileSync(tep, "utf8") }))
      .filter(({ noiDung }) =>
        /<img\b[^>]*\bsrc\s*=\s*\{[^}]*(?:thumbnail|images?\s*\[)/s.test(noiDung)
      )
      .map(({ tep }) => path.relative(THU_MUC_SRC, tep));

    expect(viPham).toEqual([]);
  });

  test("manifest phủ đủ mọi URL ảnh sản phẩm nguồn", () => {
    const urls = new Set(docSanPhamNguon().flatMap((sanPham) => sanPham.images));
    expect(urls.size).toBe(221);
    for (const url of urls) {
      expect(manifest.images).toHaveProperty([url]);
    }
  });

  test("mọi next/image hoặc component Anh dùng fill đều có sizes", () => {
    const viPham: string[] = [];
    for (const tep of docTatCaTepTsx(THU_MUC_SRC)) {
      const noiDung = fs.readFileSync(tep, "utf8");
      const theAnh = noiDung.match(/<(?:Image|Anh)\b[\s\S]*?\/>/g) ?? [];
      if (theAnh.some((the) => /\bfill\b/.test(the) && !/\bsizes\s*=/.test(the))) {
        viPham.push(path.relative(THU_MUC_SRC, tep));
      }
    }
    expect(viPham).toEqual([]);
  });
});
