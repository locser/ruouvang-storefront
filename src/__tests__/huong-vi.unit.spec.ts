import { layHuongVi, layNhan } from "@/lib/huong-vi";

const sp = (title: string, giaVnd = 500_000, extra: object = {}) => ({
  title,
  giaVnd,
  handle: title.toLowerCase().replace(/\W+/g, "-"),
  ...extra,
});

describe("layHuongVi", () => {
  it("nhận ra giống nho theo tên và tag", () => {
    expect(layHuongVi(sp("Stepping Stone Shiraz 2022"))).toBe("taste.shiraz");
    expect(layHuongVi(sp("Reschke Cabernet Sauvignon"))).toBe("taste.cabernet");
    expect(layHuongVi(sp("Kim Crawford Sauvignon Blanc"))).toBe("taste.sauvignon-blanc");
    expect(layHuongVi(sp("Wine X", 1, { tags: ["Pinot Noir"] }))).toBe("taste.pinot-noir");
  });

  it("Cabernet Sauvignon không bị nhầm sang Sauvignon Blanc", () => {
    expect(layHuongVi(sp("Cabernet Sauvignon 2019"))).toBe("taste.cabernet");
  });

  it("không nhầm 'Port Adelaide' (bộ sưu tập) thành rượu Port", () => {
    const h = layHuongVi(sp("Mystery Red", 1, { loai: "Red Wine", tags: ["Port Adelaide Offers"] }));
    expect(h).toBe("taste.do");
  });

  it("thùng/pack và tên lạ không có mô tả", () => {
    expect(layHuongVi(sp("Shiraz 6 Pack"))).toBeNull();
    expect(layHuongVi(sp("Something Unknown"))).toBeNull();
  });
});

describe("layNhan", () => {
  it("không tự gắn 'Bán chạy' khi shop chưa đánh dấu", () => {
    expect(layNhan(sp("Merlot"), 3)).not.toContain("ban-chay");
  });

  it("gắn 'Bán chạy' khi tag của shop có", () => {
    expect(layNhan(sp("Merlot", 1, { tags: ["Best Seller"] }))[0]).toBe("ban-chay");
  });

  it("Dễ uống cho Pinot Noir, không cho Cabernet", () => {
    expect(layNhan(sp("Pinot Noir"))).toContain("de-uong");
    expect(layNhan(sp("Cabernet Sauvignon"))).not.toContain("de-uong");
  });

  it("Hợp làm quà: rượu sủi hoặc giá từ 1,5 triệu; thùng thì không", () => {
    expect(layNhan(sp("Prosecco Brut"), 3)).toContain("hop-lam-qua");
    expect(layNhan(sp("Cabernet", 2_000_000), 3)).toContain("hop-lam-qua");
    expect(layNhan(sp("Cabernet 6 Pack", 2_000_000), 3)).not.toContain("hop-lam-qua");
  });

  it("tối đa 2 nhãn mặc định", () => {
    expect(layNhan(sp("Prosecco", 2_000_000, { tags: ["Best Seller"] })).length).toBe(2);
  });
});
