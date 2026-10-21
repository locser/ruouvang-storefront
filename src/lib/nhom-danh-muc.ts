/**
 * Gom danh mục phẳng của shop thành các nhóm dễ duyệt cho trang `/danh-muc`.
 *
 * Danh mục của C.W. Wines trong Medusa là một danh sách PHẲNG (58 bộ sưu tập, không
 * cấp cha–con): vừa có lối mua ("Tất cả rượu vang", "Thùng 6 chai"), vừa có đợt
 * ưu đãi theo mùa, vừa có từng nhà rượu và các dòng của nhà rượu đó ("Schild Estate
 * Premium", "Ulithorne Paternus"…). Hiện thẳng 45 mục như nhau thì khách không biết
 * bắt đầu từ đâu — nên nhóm lại ở đây, bằng cấu hình tường minh dưới đây thay vì
 * đoán: handle nào không khớp quy tắc nào sẽ rơi vào nhóm "khác", không bị mất.
 *
 * Module thuần, không phụ thuộc Next — kiểm thử được.
 */

export interface DanhMucDau {
  handle: string;
  name: string;
}

export interface MucNhom {
  handle: string;
  /** Tên trong Medusa — dùng khi không có bản dịch trong menu. */
  name: string;
  /** Số sản phẩm đang bán; `null` khi không đếm được. */
  soSp: number | null;
}

export interface HoNhaRuou {
  goc: MucNhom;
  /** Các dòng/bộ sưu tập con của nhà rượu, nhiều hàng nhất lên trước. */
  con: MucNhom[];
}

export interface NhomTrang {
  khoa: "mua" | "uu-dai" | "nha-ruou" | "khac";
  muc: MucNhom[];
  /** Chỉ có ở nhóm `nha-ruou`. */
  ho?: HoNhaRuou[];
}

/** Lối mua chính, theo thứ tự hiển thị. */
const LOI_MUA = [
  "welcome20-discount",
  "99-6-packs",
  "club-packs",
  "discount-eligible",
  "vivino-collection",
  "limited-vineyard-release",
  "autumn-wine-guide",
];

/** Đợt ưu đãi theo mùa/đối tác. */
const UU_DAI = [
  "eofy-2026",
  "black-friday-2025",
  "all-discount-blackfriday",
  "pafc-member-offer",
  "port-adelaide-offeres",
];

/** Nhà rượu và quy tắc nhận ra các dòng con của nhà đó (theo tiền tố handle). */
const NHA_RUOU: { goc: string; tienTo?: string }[] = [
  { goc: "schild-estate", tienTo: "schild-" },
  { goc: "stonehaven", tienTo: "stonehaven-" },
  { goc: "ulithorne", tienTo: "ulithorne-" },
  { goc: "reschke", tienTo: "reschke-" },
  { goc: "bone-dry", tienTo: "bone-dry-" },
  { goc: "stepping-stone" },
  { goc: "cape-barren" },
  { goc: "dem-bones" },
  { goc: "schoolhouse" },
];

/** Không phải bộ sưu tập để khách duyệt. */
const BO_QUA = new Set(["all", "frontpage"]);

export function chiaNhom(
  danhMuc: DanhMucDau[],
  dem: Record<string, number> | null
): NhomTrang[] {
  const theoHandle = new Map(
    danhMuc.filter((d) => !BO_QUA.has(d.handle)).map((d) => [d.handle, d])
  );

  // Có số đếm thật thì bỏ bộ sưu tập rỗng; không đếm được (Meilisearch lỗi) thì
  // giữ nguyên, thà hiện thừa còn hơn mất lối vào.
  const soSp = (d: DanhMucDau): number | null => (dem ? (dem[d.handle] ?? 0) : null);
  const coHang = (m: MucNhom) => m.soSp === null || m.soSp > 0;
  const muc = (d: DanhMucDau): MucNhom => ({ handle: d.handle, name: d.name, soSp: soSp(d) });
  const dung = new Set<string>();
  const lay = (handle: string): MucNhom | null => {
    const d = theoHandle.get(handle);
    if (!d || dung.has(handle)) return null;
    const m = muc(d);
    if (!coHang(m)) return null;
    dung.add(handle);
    return m;
  };
  const theoThuTu = (ds: string[]) => ds.map(lay).filter((m): m is MucNhom => m !== null);
  const nhieuHangTruoc = (a: MucNhom, b: MucNhom) => (b.soSp ?? 0) - (a.soSp ?? 0);

  const nhom: NhomTrang[] = [];

  const mua = theoThuTu(LOI_MUA);
  if (mua.length) nhom.push({ khoa: "mua", muc: mua });

  const uuDai = theoThuTu(UU_DAI);
  if (uuDai.length) nhom.push({ khoa: "uu-dai", muc: uuDai });

  const ho: HoNhaRuou[] = [];
  for (const nr of NHA_RUOU) {
    const goc = lay(nr.goc);
    const con = nr.tienTo
      ? [...theoHandle.keys()]
          .filter((h) => h.startsWith(nr.tienTo!) && h !== nr.goc)
          .map(lay)
          .filter((m): m is MucNhom => m !== null)
          .sort(nhieuHangTruoc)
      : [];
    // Nhà rượu có dòng con mà bản thân bộ sưu tập gốc rỗng: lấy dòng đông nhất làm đại diện.
    const dai = goc ?? con.shift() ?? null;
    if (dai) ho.push({ goc: dai, con });
  }
  ho.sort((a, b) => (b.goc.soSp ?? 0) - (a.goc.soSp ?? 0));
  if (ho.length) nhom.push({ khoa: "nha-ruou", muc: ho.map((h) => h.goc), ho });

  const khac = [...theoHandle.keys()].map(lay).filter((m): m is MucNhom => m !== null).sort(nhieuHangTruoc);
  if (khac.length) nhom.push({ khoa: "khac", muc: khac });

  return nhom;
}
