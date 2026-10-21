import { taoSitemapCwWines } from "@/lib/sitemap-cwwines";
import { TRANG_TINH } from "@/lib/trang-tinh-cwwines";
import {
  docBlogNguon,
  docDanhMucNguon,
  docSanPhamNguon,
} from "./du-lieu-cwwines";

describe("B5 — sitemap đầy đủ và nhất quán", () => {
  test("chứa đủ sản phẩm bán được, bài blog, danh mục và trang tĩnh", () => {
    const sitemap = taoSitemapCwWines({
      goc: "https://ruouvang.polarisvn.holdings",
      capNhat: new Date("2026-08-19T00:00:00Z"),
      danhMuc: docDanhMucNguon(),
      sanPham: docSanPhamNguon(),
      baiBlog: docBlogNguon(),
      trangTinh: TRANG_TINH,
    });
    const urls = sitemap.map((muc) => muc.url);

    expect(urls.filter((url) => url.includes("/danh-muc/")).length).toBe(58);
    expect(urls.filter((url) => url.includes("/san-pham/")).length).toBe(182);
    expect(urls.filter((url) => url.includes("/blog/")).length).toBe(9);
    expect(urls.filter((url) => url.includes("/chinh-sach/")).length).toBe(68);
    expect(urls).toHaveLength(321);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("không chứa sản phẩm giá 0 đã bị loại", () => {
    const sitemap = taoSitemapCwWines({
      goc: "https://ruouvang.polarisvn.holdings",
      capNhat: new Date("2026-08-19T00:00:00Z"),
      danhMuc: docDanhMucNguon(),
      sanPham: docSanPhamNguon(),
      baiBlog: docBlogNguon(),
      trangTinh: TRANG_TINH,
    });
    const noiDung = sitemap.map((muc) => muc.url).join("\n");

    expect(noiDung).not.toContain("/san-pham/manly-sea-eagles-magnum");
    expect(noiDung).not.toContain("/san-pham/pafc-member-offer");
    expect(noiDung).not.toContain("/san-pham/handpicked-schild-estate-pack");
  });
});
