import { chiaNhom } from "@/lib/nhom-danh-muc";

const dm = (handle: string, name = handle) => ({ handle, name });

const DANH_MUC = [
  dm("all", "Shop"),
  dm("frontpage", "Home page"),
  dm("welcome20-discount", "All wine"),
  dm("99-6-packs", "6-Packs"),
  dm("eofy-2026", "EOFY 2026"),
  dm("schild-estate", "Schild Estate"),
  dm("schild-estate-premium", "Schild Estate Premium"),
  dm("schild-cba", "Schild CBA"),
  dm("ulithorne", "Ulithorne"),
  dm("ulithorne-paternus", "Ulithorne Paternus"),
  dm("stepping-stone", "Stepping Stone"),
  dm("boisterous", "Boisterous"),
  dm("lonely-collection", "Lonely"),
];

const DEM = {
  "welcome20-discount": 172,
  "99-6-packs": 7,
  "eofy-2026": 115,
  "schild-estate": 27,
  "schild-estate-premium": 10,
  "schild-cba": 15,
  ulithorne: 17,
  "ulithorne-paternus": 4,
  "stepping-stone": 11,
  boisterous: 0,
  "lonely-collection": 3,
};

describe("chiaNhom", () => {
  const nhom = chiaNhom(DANH_MUC, DEM);
  const theoKhoa = (k: string) => nhom.find((n) => n.khoa === k);

  it("bỏ mục nội bộ (all, frontpage) và bộ sưu tập rỗng", () => {
    const tatCa = nhom.flatMap((n) => [...n.muc, ...(n.ho ?? []).flatMap((h) => [h.goc, ...h.con])]);
    const handles = tatCa.map((m) => m.handle);
    expect(handles).not.toContain("all");
    expect(handles).not.toContain("frontpage");
    expect(handles).not.toContain("boisterous");
  });

  it("đặt lối mua theo thứ tự cấu hình, ưu đãi riêng nhóm", () => {
    expect(theoKhoa("mua")?.muc.map((m) => m.handle)).toEqual(["welcome20-discount", "99-6-packs"]);
    expect(theoKhoa("uu-dai")?.muc.map((m) => m.handle)).toEqual(["eofy-2026"]);
  });

  it("gom các dòng rượu vào nhà rượu, nhiều hàng nhất lên trước", () => {
    const ho = theoKhoa("nha-ruou")!.ho!;
    expect(ho.map((h) => h.goc.handle)).toEqual(["schild-estate", "ulithorne", "stepping-stone"]);
    expect(ho[0].con.map((c) => c.handle)).toEqual(["schild-cba", "schild-estate-premium"]);
    expect(ho[2].con).toEqual([]);
  });

  it("mỗi bộ sưu tập chỉ xuất hiện đúng một lần; phần còn lại rơi vào 'khác'", () => {
    const tatCa = nhom.flatMap((n) =>
      n.khoa === "nha-ruou"
        ? n.ho!.flatMap((h) => [h.goc.handle, ...h.con.map((c) => c.handle)])
        : n.muc.map((m) => m.handle)
    );
    expect(new Set(tatCa).size).toBe(tatCa.length);
    expect(theoKhoa("khac")?.muc.map((m) => m.handle)).toEqual(["lonely-collection"]);
  });

  it("không đếm được (null) thì giữ nguyên mọi mục, không ẩn nhầm", () => {
    const khongDem = chiaNhom(DANH_MUC, null);
    const handles = khongDem.flatMap((n) => n.muc.map((m) => m.handle));
    expect(handles).toContain("boisterous");
    expect(khongDem.flatMap((n) => n.muc).every((m) => m.soSp === null)).toBe(true);
  });
});
