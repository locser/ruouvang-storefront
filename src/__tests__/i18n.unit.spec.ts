import { DEFAULT_LOCALE, LOCALES, LOCALE_META, laLocale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import { giaTriTheoNgonNgu, layMang, layTruong, noiSuy, translate } from "@/i18n/translate";
import { KHOA_NHAN } from "@/lib/huong-vi";

describe("danh mục dịch", () => {
  const khoaGoc = Object.keys(MESSAGES[DEFAULT_LOCALE]).sort();

  it.each(LOCALES.filter((l) => l !== DEFAULT_LOCALE))(
    "%s có đủ và không thừa khoá so với ngôn ngữ gốc",
    (l) => {
      const khoa = Object.keys(MESSAGES[l]).sort();
      const thieu = khoaGoc.filter((k) => !khoa.includes(k));
      const thua = khoa.filter((k) => !khoaGoc.includes(k));
      expect({ thieu, thua }).toEqual({ thieu: [], thua: [] });
    }
  );

  it.each(LOCALES)("%s: mọi bản dịch không rỗng và cùng bộ tham số {x} với ngôn ngữ gốc", (l) => {
    const thamSo = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const [k, v] of Object.entries(MESSAGES[l])) {
      expect(v.trim()).not.toBe("");
      expect([k, thamSo(v)]).toEqual([k, thamSo(MESSAGES[DEFAULT_LOCALE][k])]);
    }
  });

  it("mọi ngôn ngữ đều có thông tin hiển thị", () => {
    for (const l of LOCALES) expect(LOCALE_META[l].nhan).toBeTruthy();
  });

  it("các khoá nhãn sản phẩm và hương vị đều tồn tại", () => {
    for (const k of Object.values(KHOA_NHAN)) expect(MESSAGES[DEFAULT_LOCALE][k]).toBeDefined();
    expect(Object.keys(MESSAGES[DEFAULT_LOCALE]).filter((k) => k.startsWith("taste.")).length).toBeGreaterThan(5);
  });
});

describe("translate", () => {
  it("nội suy tham số và giữ nguyên tham số không được truyền", () => {
    expect(noiSuy("Chỉ còn {n} chai", { n: 3 })).toBe("Chỉ còn 3 chai");
    expect(noiSuy("a {x} b", {})).toBe("a {x} b");
  });

  it("trả đúng ngôn ngữ và rơi về ngôn ngữ gốc khi thiếu bản dịch", () => {
    expect(translate("en", "common.home")).toBe("Home");
    expect(translate("vi", "common.home")).toBe("Trang chủ");
    const goc = MESSAGES.en["common.home"];
    delete MESSAGES.en["common.home"];
    try {
      expect(translate("en", "common.home")).toBe("Trang chủ");
    } finally {
      MESSAGES.en["common.home"] = goc;
    }
  });

  it("khoá không tồn tại trả về chính khoá", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(translate("en", "khong.co.khoa")).toBe("khong.co.khoa");
    warn.mockRestore();
  });
});

describe("dữ liệu động theo hậu tố ngôn ngữ", () => {
  const muc = { ten: "Rượu vang đỏ", tenEn: "Red wine" };

  it("chọn trường theo ngôn ngữ, thiếu thì dùng bản gốc", () => {
    expect(layTruong(muc, "ten", "vi")).toBe("Rượu vang đỏ");
    expect(layTruong(muc, "ten", "en")).toBe("Red wine");
    expect(layTruong({ ten: "Chỉ có gốc" }, "ten", "en")).toBe("Chỉ có gốc");
    expect(layTruong(null, "ten", "en")).toBe("");
  });

  it("giaTriTheoNgonNgu trả đủ mọi ngôn ngữ đã đăng ký", () => {
    expect(Object.keys(giaTriTheoNgonNgu(muc, "ten")).sort()).toEqual([...LOCALES].sort());
  });

  it("layMang rơi về mảng gốc", () => {
    expect(layMang({ camKet: ["a"], camKetEn: ["b"] }, "camKet", "en")).toEqual(["b"]);
    expect(layMang({ camKet: ["a"] }, "camKet", "en")).toEqual(["a"]);
  });

  it("laLocale chỉ nhận ngôn ngữ đã đăng ký", () => {
    expect(laLocale("vi")).toBe(true);
    expect(laLocale("xx")).toBe(false);
    expect(laLocale(undefined)).toBe(false);
  });
});
