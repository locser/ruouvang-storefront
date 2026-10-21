import type { Metadata } from "next";
import Link from "next/link";
import T, { TL } from "@/components/T";
import Hien from "@/components/Hien";
import NutHoiAI from "@/components/NutHoiAI";
import { layCayDanhMuc, type DanhMuc } from "@/lib/medusa-catalog";
import { demSanPhamTheoDanhMuc } from "@/lib/meili";
import { chiaNhom, type MucNhom, type NhomTrang } from "@/lib/nhom-danh-muc";
import { MENU, danhMucHienTrongDieuHuong, duongDanDanhMuc } from "@/lib/theme";

/**
 * Trang tất cả bộ sưu tập — thiết kế lại.
 *
 * Danh mục của shop là danh sách phẳng 45+ mục; liệt kê thẳng như bản cũ thì khách
 * không biết bắt đầu từ đâu. Ở đây các mục được gom thành bốn nhóm có nghĩa (lối
 * mua · ưu đãi theo mùa · nhà rượu và các dòng của họ · bộ sưu tập khác) bằng
 * `lib/nhom-danh-muc.ts`, kèm số chai THẬT lấy từ chỉ mục tìm kiếm. Một hàng chip
 * dính đầu trang nhảy nhanh tới từng nhóm, nhất là trên điện thoại.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tất cả bộ sưu tập rượu vang",
  description:
    "Toàn bộ bộ sưu tập tại C.W. Wines: rượu vang Úc theo nhà rượu, thùng 6 chai, gói câu lạc bộ và các đợt ưu đãi.",
  alternates: { canonical: "/danh-muc" },
};

/** Bản dịch tên bộ sưu tập lấy từ menu (cùng nguồn với thanh điều hướng). */
function tenHienThi(m: MucNhom): Record<string, string> {
  const trongMenu = MENU.find((x) => x.handle === m.handle);
  return trongMenu
    ? { ten: trongMenu.ten, tenEn: trongMenu.tenEn }
    : { ten: m.name, tenEn: m.name };
}

function SoChai({ n }: { n: number | null }) {
  if (n === null) return null;
  return <T k={n === 1 ? "categories.one_wine" : "categories.n_wines"} v={{ n }} />;
}

function MuiTen({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} stroke-current`}
      fill="none"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

const TIEU_DE_NHOM: Record<NhomTrang["khoa"], { tieuDe: string; moTa: string; neo: string }> = {
  mua: { tieuDe: "categories.shop_title", moTa: "categories.shop_desc", neo: "mua" },
  "uu-dai": { tieuDe: "categories.offers_title", moTa: "categories.offers_desc", neo: "uu-dai" },
  "nha-ruou": { tieuDe: "categories.producers_title", moTa: "categories.producers_desc", neo: "nha-ruou" },
  khac: { tieuDe: "categories.other_title", moTa: "categories.other_desc", neo: "khac" },
};

/** Ô lớn cho lối mua chính; ô đầu tiên nhấn màu rượu. */
function LoiMua({ muc }: { muc: MucNhom[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {muc.map((m, i) => {
        const noiBat = i === 0;
        return (
          <li key={m.handle} className={noiBat ? "col-span-2" : ""}>
            <Link
              href={duongDanDanhMuc(m.handle)}
              className={`group flex h-full min-h-[116px] flex-col justify-between border p-4 transition-colors duration-300 md:min-h-[148px] md:p-6 ${
                noiBat
                  ? "nen-toi border-wine bg-wine text-page hover:bg-wine-dark"
                  : "border-line bg-cream text-ink hover:border-wine"
              }`}
            >
              <span
                className={`font-display text-[22px] leading-tight md:text-[28px] ${
                  noiBat ? "!text-page" : ""
                }`}
              >
                <TL obj={tenHienThi(m)} field="ten" />
              </span>
              <span className="mt-4 flex items-end justify-between gap-3">
                <span
                  className={`text-[12px] tracking-wide ${noiBat ? "text-page/70" : "text-ink-soft"}`}
                >
                  <SoChai n={m.soSp} />
                </span>
                <MuiTen
                  className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
                    noiBat ? "text-copper-light" : "text-copper"
                  }`}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Danh sách dòng kẻ — gọn, bấm dễ trên điện thoại. */
function DanhSachDong({ muc }: { muc: MucNhom[] }) {
  return (
    <ul className="m-0 grid list-none gap-x-14 border-t border-line p-0 md:grid-cols-2">
      {muc.map((m) => (
        <li key={m.handle} className="border-b border-line">
          <Link
            href={duongDanDanhMuc(m.handle)}
            className="group flex min-h-[60px] items-center justify-between gap-4 py-3 active:opacity-60"
          >
            <span className="font-display text-[22px] leading-tight text-ink transition-colors duration-200 group-hover:text-wine">
              <TL obj={tenHienThi(m)} field="ten" />
            </span>
            <span className="flex shrink-0 items-center gap-3 text-[12px] tracking-wide text-ink-soft">
              <SoChai n={m.soSp} />
              <MuiTen className="h-[16px] w-[16px] text-copper transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ChipDanhMuc({ m }: { m: MucNhom }) {
  return (
    <Link
      href={duongDanDanhMuc(m.handle)}
      className="inline-flex min-h-[40px] items-center gap-2 border border-ink/20 px-3.5 text-[13px] text-ink-muted transition-colors duration-200 hover:border-wine hover:text-wine active:border-wine active:text-wine"
    >
      <TL obj={tenHienThi(m)} field="ten" />
      {m.soSp !== null && (
        <span className="text-[11px] tabular-nums text-ink-soft">{m.soSp}</span>
      )}
    </Link>
  );
}

function ThePhuongNhaRuou({ nhom }: { nhom: NhomTrang }) {
  const ho = nhom.ho ?? [];
  const coDong = ho.filter((h) => h.con.length > 0);
  const donLe = ho.filter((h) => h.con.length === 0);

  return (
    <>
      {coDong.length > 0 && (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {coDong.map((h) => (
            <li key={h.goc.handle} className="flex flex-col border border-line bg-cream p-5 md:p-6">
              <Link
                href={duongDanDanhMuc(h.goc.handle)}
                className="group flex items-start justify-between gap-3 active:opacity-60"
              >
                <span>
                  <span className="block font-display text-[26px] leading-tight text-ink transition-colors duration-200 group-hover:text-wine md:text-[30px]">
                    <TL obj={tenHienThi(h.goc)} field="ten" />
                  </span>
                  <span className="mt-1.5 block text-[12px] tracking-wide text-ink-soft">
                    <SoChai n={h.goc.soSp} />
                  </span>
                </span>
                <MuiTen className="mt-1.5 h-[18px] w-[18px] shrink-0 text-copper transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <span className="my-5 block h-px w-10 bg-copper" aria-hidden="true" />
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {h.con.map((c) => (
                  <li key={c.handle}>
                    <ChipDanhMuc m={c} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* Nhà rượu chỉ có một bộ sưu tập: ô gọn, không chừa khoảng trống cho dòng con */}
      {donLe.length > 0 && (
        <ul
          className={`m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 md:gap-5 lg:grid-cols-4 ${
            coDong.length > 0 ? "mt-4 md:mt-5" : ""
          }`}
        >
          {donLe.map((h) => (
            <li key={h.goc.handle}>
              <Link
                href={duongDanDanhMuc(h.goc.handle)}
                className="group flex h-full min-h-[88px] items-start justify-between gap-3 border border-line bg-cream p-4 transition-colors duration-300 hover:border-wine active:border-wine md:p-5"
              >
                <span>
                  <span className="block font-display text-[21px] leading-tight text-ink transition-colors duration-200 group-hover:text-wine md:text-[24px]">
                    <TL obj={tenHienThi(h.goc)} field="ten" />
                  </span>
                  <span className="mt-1.5 block text-[12px] tracking-wide text-ink-soft">
                    <SoChai n={h.goc.soSp} />
                  </span>
                </span>
                <MuiTen className="mt-1 h-[16px] w-[16px] shrink-0 text-copper transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function TrangTatCaDanhMuc() {
  const locCay = (danhSach: DanhMuc[]): DanhMuc[] =>
    danhSach.filter((muc) => danhMucHienTrongDieuHuong(muc.handle));
  const [cay, dem] = await Promise.all([layCayDanhMuc(), demSanPhamTheoDanhMuc()]);
  const nhom = chiaNhom(
    locCay(cay).map((d) => ({ handle: d.handle, name: d.name })),
    dem
  );
  const tongBoSuuTap = nhom.reduce((t, n) => t + n.muc.length, 0);

  return (
    <div className="container-site py-8 md:py-14">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 hidden flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-soft sm:flex"
      >
        <Link href="/" className="transition-colors hover:text-wine">
          <T k="common.home" />
        </Link>
        <span aria-hidden className="text-copper">/</span>
        <span aria-current="page" className="text-ink">
          <T k="categories.title" />
        </span>
      </nav>

      <header className="mb-8 text-center md:mb-12">
        <p className="nhan-nho mb-3 md:mb-4">
          <T k="categories.eyebrow" />
        </p>
        <h1 className="tieu-de-section gach-tieu-de">
          <T k="categories.title" />
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          <T k="categories.intro" v={{ n: tongBoSuuTap }} />
        </p>
      </header>

      {nhom.length === 0 ? (
        <p className="py-16 text-center font-display text-[24px] italic text-ink-muted">
          <T k="categories.empty" />
        </p>
      ) : (
        <>
          {/* Nhảy nhanh tới từng nhóm — dính dưới header, cuộn ngang trên mobile */}
          <nav
            aria-label="Sections"
            className="cuon-ngang sticky top-[76px] z-20 -mx-5 mb-10 flex gap-2 overflow-x-auto border-y border-line bg-page px-5 py-2.5 md:mx-0 md:mb-14 md:justify-center md:px-0 lg:top-[88px]"
          >
            {nhom.map((n) => (
              <a
                key={n.khoa}
                href={`#${TIEU_DE_NHOM[n.khoa].neo}`}
                className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap border border-ink/20 px-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-muted transition-colors duration-200 hover:border-wine hover:text-wine active:border-wine active:text-wine"
              >
                <T k={TIEU_DE_NHOM[n.khoa].tieuDe} />
              </a>
            ))}
          </nav>

          <div className="space-y-16 md:space-y-24">
            {nhom.map((n, i) => {
              const tt = TIEU_DE_NHOM[n.khoa];
              return (
                <section
                  key={n.khoa}
                  id={tt.neo}
                  aria-labelledby={`${tt.neo}-tieu-de`}
                  className="scroll-mt-[150px] lg:scroll-mt-[170px]"
                >
                  <Hien className="mb-6 md:mb-8">
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-[20px] italic text-copper md:text-[24px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2
                        id={`${tt.neo}-tieu-de`}
                        className="m-0 font-display text-[30px] font-normal leading-tight md:text-[42px]"
                      >
                        <T k={tt.tieuDe} />
                      </h2>
                    </div>
                    <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted md:pl-[3.1rem]">
                      <T k={tt.moTa} />
                    </p>
                  </Hien>

                  {n.khoa === "mua" && <LoiMua muc={n.muc} />}
                  {n.khoa === "uu-dai" && <DanhSachDong muc={n.muc} />}
                  {n.khoa === "nha-ruou" && <ThePhuongNhaRuou nhom={n} />}
                  {n.khoa === "khac" && (
                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                      {n.muc.map((m) => (
                        <li key={m.handle}>
                          <ChipDanhMuc m={m} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Lời mời cuối trang */}
      <section className="nen-toi mt-20 bg-wine px-6 py-14 text-center text-page md:mt-28 md:py-20">
        <span className="mx-auto mb-6 block h-px w-14 bg-copper" aria-hidden="true" />
        <h2 className="mx-auto max-w-xl font-display text-[30px] font-normal leading-[1.15] !text-page md:text-[42px]">
          <T k="categories.cta_title" emClassName="italic text-copper-light" />
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-[1.8] text-page/75">
          <T k="categories.cta_desc" />
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/blog" className="btn-dong">
            <T k="categories.cta_journal" />
          </Link>
          <Link href="/he-thong-cua-hang" className="btn-den">
            <T k="common.find_a_store" />
          </Link>
        </div>
        <NutHoiAI className="mt-8" />
      </section>
    </div>
  );
}
